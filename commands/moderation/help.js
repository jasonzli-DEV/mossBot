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
            '`/mute` - Mute a member for a specified duration\n' +
            '`/unmute` - Unmute a muted member\n' +
            '`/purge` - Delete multiple messages at once\n' +
            '`/say` - Make the bot say something\n' +
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
            '`/link` - Link your Minecraft account to track activity\n' +
            '`/unlink` - Unlink your account and remove activity data\n' +
            '*Activity is automatically tracked when you\'re online in Minecraft!*',
          inline: false,
        },
        {
          name: '⚙️ Setup Commands (Admin only)',
          value: 
            '`/set-playerlist-channel` - Set channel for player list tracking\n' +
            '`/set-commands-channel` - Set channel for bot commands\n' +
            '`/set-moderator-channel` - Set channel for mod notifications\n' +
            '`/set-tempvoice` - Set temp voice channel creator',
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
