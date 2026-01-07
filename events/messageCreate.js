module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const content = message.content.trim().toLowerCase();

        // If the message is already the correction, ignore it
        if (content === 'lmayo') return;

        // Only trigger when 'lol' or 'lmao' appear as standalone words
        const triggerRegex = /\b(?:lol|lmao)\b/;
        if (triggerRegex.test(content)) return message.reply('*lmayo');
    },
};