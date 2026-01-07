const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BotConfig = require('../../schemas/BotConfig');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto-role-disable')
    .setDescription('Disable automatic role assignment for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    // Check if user is a moderator
    const userIsMod = await isModerator(interaction.member);
    if (!userIsMod) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command!',
        ephemeral: true,
      });
    }
    
    // Get config
    let config = await BotConfig.findOne({ guildId: interaction.guild.id });
    
    if (!config || !config.autoRoleEnabled) {
      return interaction.reply({
        content: '❌ Auto-role is not currently enabled!',
        ephemeral: true,
      });
    }
    
    config.autoRoleEnabled = false;
    await config.save();
    
    await interaction.reply({
      content: '✅ Auto-role has been disabled!\n\nNew members will no longer automatically receive a role.\n\n*Use `/auto-role <role>` to enable it again.*',
      ephemeral: true,
    });
  },
};
