const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-onboarding-channel')
    .setDescription('Set up the onboarding panel in a channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send the onboarding panel to')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    
    // Get or create config
    let config = await BotConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = await BotConfig.create({ guildId: interaction.guild.id });
    }
    
    // Check if unverified and verified roles are set
    if (!config.unverifiedRoleId || !config.verifiedRoleId) {
      return interaction.reply({
        content: '❌ You must set both the unverified and verified roles first!\n\nUse:\n• `/set-unverified-role` - Role given to new members\n• `/set-verified-role` - Role given after completing onboarding',
        ephemeral: true,
      });
    }
    
    // Check if the roles still exist
    const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
    const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
    
    if (!unverifiedRole || !verifiedRole) {
      return interaction.reply({
        content: '❌ The configured unverified or verified role no longer exists! Please set them again.',
        ephemeral: true,
      });
    }
    
    // Create the onboarding panel embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('👋 Welcome to the Server!')
      .setDescription(
        '**Complete the onboarding process to gain access to the server.**\n\n' +
        '📋 **Steps to complete:**\n' +
        '1️⃣ Set your timezone\n' +
        '2️⃣ Link your Minecraft account\n\n' +
        'Click the button below to get started!'
      )
      .setFooter({ text: 'This process only takes a minute!' });
    
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('onboarding_start')
        .setLabel('🚀 Start Onboarding')
        .setStyle(ButtonStyle.Success)
    );
    
    // Delete old onboarding message if it exists
    if (config.onboardingMessageId && config.onboardingChannelId) {
      try {
        const oldChannel = await interaction.guild.channels.fetch(config.onboardingChannelId).catch(() => null);
        if (oldChannel) {
          const oldMessage = await oldChannel.messages.fetch(config.onboardingMessageId).catch(() => null);
          if (oldMessage) {
            await oldMessage.delete().catch(() => {});
          }
        }
      } catch (error) {
        // Ignore errors when deleting old message
      }
    }
    
    // Send the new onboarding panel
    const panelMessage = await channel.send({
      embeds: [embed],
      components: [button],
    });
    
    // Save to config
    config.onboardingChannelId = channel.id;
    config.onboardingMessageId = panelMessage.id;
    await config.save();
    
    await interaction.reply({
      content: `✅ Onboarding panel has been set up in ${channel}!\n\n**Configuration:**\n• Unverified Role: ${unverifiedRole}\n• Verified Role: ${verifiedRole}`,
      ephemeral: true,
    });
  },
};
