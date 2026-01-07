const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BotConfig = require('../../schemas/BotConfig');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto-role')
    .setDescription('Set a role to automatically assign to new members')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to automatically assign')
        .setRequired(true)
    )
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
    
    const role = interaction.options.getRole('role');
    
    // Check if bot can assign this role
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: '❌ I cannot assign this role! It is higher than or equal to my highest role.',
        ephemeral: true,
      });
    }
    
    // Get or create config
    let config = await BotConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = await BotConfig.create({ guildId: interaction.guild.id });
    }
    
    config.autoRoleId = role.id;
    config.autoRoleEnabled = true;
    await config.save();
    
    await interaction.reply({
      content: `✅ Auto-role has been set to ${role}!\n\nNew members will automatically receive this role when they join.\n\n*Use \`/auto-role-disable\` to turn off auto-role.*`,
      ephemeral: true,
    });
  },
};
