const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const BotConfig = require('../schemas/BotConfig');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Serving ${client.users.cache.size} user(s)`);
    
    // Refresh onboarding panels for all guilds
    console.log('🔄 Refreshing onboarding panels...');
    const configs = await BotConfig.find({
      onboardingChannelId: { $ne: null },
      onboardingMessageId: { $ne: null },
    });
    
    for (const config of configs) {
      try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;
        
        const channel = guild.channels.cache.get(config.onboardingChannelId);
        if (!channel) {
          console.log(`⚠️  Onboarding channel not found for guild ${guild.name}, skipping...`);
          continue;
        }
        
        // Delete old message if it exists
        try {
          const oldMessage = await channel.messages.fetch(config.onboardingMessageId).catch(() => null);
          if (oldMessage) {
            await oldMessage.delete();
            console.log(`🗑️  Deleted stale onboarding panel in ${guild.name}`);
          }
        } catch (error) {
          console.log(`⚠️  Could not delete old onboarding message in ${guild.name}`);
        }
        
        // Create new onboarding panel
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
        
        const newMessage = await channel.send({
          embeds: [embed],
          components: [button],
        });
        
        // Update config with new message ID
        config.onboardingMessageId = newMessage.id;
        await config.save();
        
        console.log(`✅ Refreshed onboarding panel in ${guild.name}`);
      } catch (error) {
        console.error(`❌ Error refreshing onboarding panel for guild ${config.guildId}:`, error);
      }
    }
    
    console.log('✅ Onboarding panel refresh complete!');
  },
};
