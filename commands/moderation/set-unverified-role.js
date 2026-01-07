const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-unverified-role')
    .setDescription('Set the role given to new members before onboarding')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The unverified role')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    const role = interaction.options.getRole('role');
    
    // Get or create config
    let config = await BotConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = await BotConfig.create({ guildId: interaction.guild.id });
    }
    
    config.unverifiedRoleId = role.id;
    await config.save();
    
    await interaction.reply({
      content: `✅ Unverified role has been set to ${role}!\n\nNew members will automatically receive this role when they join.\n\n**Next steps:**\n• Use \`/set-verified-role\` to set the role given after onboarding\n• Use \`/set-onboarding-channel\` to create the onboarding panel`,
      ephemeral: true,
    });
  },
};
