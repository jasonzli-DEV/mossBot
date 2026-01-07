const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-verified-role')
    .setDescription('Set the role given to members after completing onboarding')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The verified role')
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
    
    config.verifiedRoleId = role.id;
    await config.save();
    
    await interaction.reply({
      content: `✅ Verified role has been set to ${role}!\n\nMembers will receive this role after completing onboarding.\n\n**Next steps:**\n• Use \`/set-unverified-role\` to set the role for new members\n• Use \`/set-onboarding-channel\` to create the onboarding panel`,
      ephemeral: true,
    });
  },
};
