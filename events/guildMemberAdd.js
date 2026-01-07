const BotConfig = require('../schemas/BotConfig');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);
    
    try {
      // Get config for this guild
      const config = await BotConfig.findOne({ guildId: member.guild.id });
      
      if (config) {
        // Assign auto-role if enabled
        if (config.autoRoleEnabled && config.autoRoleId) {
          const autoRole = member.guild.roles.cache.get(config.autoRoleId);
          if (autoRole) {
            await member.roles.add(autoRole).catch(err => {
              console.error(`Failed to assign auto-role to ${member.user.tag}:`, err);
            });
            console.log(`✅ Assigned auto-role ${autoRole.name} to ${member.user.tag}`);
          }
        }
        
        // Assign unverified role if onboarding is set up
        if (config.unverifiedRoleId) {
          const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);
          if (unverifiedRole) {
            await member.roles.add(unverifiedRole).catch(err => {
              console.error(`Failed to assign unverified role to ${member.user.tag}:`, err);
            });
            console.log(`✅ Assigned unverified role ${unverifiedRole.name} to ${member.user.tag}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in guildMemberAdd:', error);
    }
    
    // Send welcome message to a welcome channel if configured
    const welcomeChannelId = process.env.WelcomeChannelID;
    
    if (welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (channel) {
        await channel.send(`Welcome to the server, ${member}! You are member number ${member.guild.memberCount}! 🎉`);
      }
    }
  },
};
