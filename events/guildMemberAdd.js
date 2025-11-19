module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);
    
    // Send welcome message to a welcome channel if configured
    const welcomeChannelId = process.env.WelcomeChannelID;
    
    if (welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (channel) {
        await channel.send(`Welcome to the server, ${member}! 🎉`);
      }
    }
  },
};
