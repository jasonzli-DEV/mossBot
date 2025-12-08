module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        console.log(`👋 ${member.user.tag} left ${member.guild.name}`);

        // Send farewell message to a farewell channel if configured
        const welcomeChannelID = process.env.WelcomeChannelID;

        if (welcomeChannelID) {
            const channel = member.guild.channels.cache.get(welcomeChannelID);
            if (channel) {
                await channel.send(`${member.user.tag}, Why would you leave us..? 😢`);
            }
        }
    }
}