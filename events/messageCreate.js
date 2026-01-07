module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const content = message.content.trim().toLowerCase();

        if (content.includes('lol')) return message.reply('*lmayo');
        if (content.includes('lmao')) return message.reply('*lmayo');
    },
};