const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🤖 MossBot Commands')
      .setDescription('Here are all the available commands:')
      .addFields(
        {
          name: '🛡️ Moderation Commands',
          value: 
            '`/ban` - Ban a member from the server\n' +
            '`/kick` - Kick a member from the server\n' +
            '`/role-add` - Add a role to a member\n' +
            '`/role-remove` - Remove a role from a member\n' +
            '`/add-moderator` - Add a user as a moderator (Admin only)\n' +
            '`/remove-moderator` - Remove a moderator (Admin only)\n' +
            '`/list-moderators` - List all moderators\n' +
            '`/status` - Set bot status (Moderators only)',
          inline: false,
        },
        {
          name: '📊 Activity Commands',
          value: 
            '`/online` - Mark yourself as online\n' +
            '`/offline` - Mark yourself as offline\n' +
            '*Activity is tracked with day/week/month statistics*',
          inline: false,
        },
        {
          name: 'ℹ️ Information Commands',
          value: 
            '`/help` - Display this help message\n' +
            '`/serverinfo` - Display server information',
          inline: false,
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
