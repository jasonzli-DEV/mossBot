const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserTimezone = require('../../schemas/UserTimezone');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('local-time')
    .setDescription('View another user\'s local time')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check the local time for')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    
    // Find the user's timezone
    const userTimezone = await UserTimezone.findOne({
      guildId: interaction.guild.id,
      userId: targetUser.id,
    });
    
    if (!userTimezone) {
      return interaction.reply({
        content: `**${targetUser.displayName}** has not yet set their timezone!`,
        ephemeral: true,
      });
    }
    
    const timezone = userTimezone.timezone;
    const now = new Date();
    
    // Format date
    const dateStr = now.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Format time
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🕐 Local Time - ${targetUser.displayName}`)
      .addFields(
        { name: '📅 Date', value: dateStr, inline: true },
        { name: '⏰ Time', value: timeStr, inline: true },
      )
      .setFooter({ text: `Timezone: ${timezone}` })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
    
    await interaction.reply({
      embeds: [embed],
    });
  },
};
