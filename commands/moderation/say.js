const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message (Moderators only)')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message to send')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send the message to (defaults to current)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Embed color (choose preset: blue, green, red, yellow, purple, orange, pink, black, none)')
        .setRequired(false)
        .addChoices(
          { name: 'None', value: 'none' },
          { name: 'Blue', value: 'blue' },
          { name: 'Green', value: 'green' },
          { name: 'Red', value: 'red' },
          { name: 'Yellow', value: 'yellow' },
          { name: 'Purple', value: 'purple' },
          { name: 'Orange', value: 'orange' },
          { name: 'Pink', value: 'pink' },
          { name: 'Black', value: 'black' }
        )
    )
  ,
  async execute(interaction, client) {
    // Check if user is a moderator
    const userIsMod = await isModerator(interaction.member);
    
    if (!userIsMod) {
      return interaction.reply({ 
        content: '❌ You must be a moderator or administrator to use this command!', 
        flags: [4096]
      });
    }

    const message = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    // If color is provided, send embed; else, send plain message

    // Check if target channel is a text channel
    if (!targetChannel.isTextBased()) {
      return interaction.reply({ 
        content: '❌ You can only send messages to text channels!', 
        flags: [4096]
      });
    }

    try {
      // Always show color select menu for embed, single interaction
    const colorOption = interaction.options.getString('color');
    const presetColors = {
      blue: 0x5865F2,
      green: 0x00FF00,
      red: 0xFF0000,
      yellow: 0xFFFF00,
      purple: 0x9B59B6,
      orange: 0xFF8C00,
      pink: 0xFF69B4,
      black: 0x000000
    };
    if (colorOption && colorOption !== 'none') {
      // Send embed with preset color
      const color = presetColors[colorOption] || null;
      const embed = new EmbedBuilder().setDescription(message).setTimestamp();
      if (color) embed.setColor(color);
      await targetChannel.send({ embeds: [embed] });
      const replyMsg = await interaction.reply({ content: `✅ Embed sent to ${targetChannel}!`, flags: [4096] });
      setTimeout(async () => {
        try { await interaction.deleteReply(); } catch {}
      }, 5000);
    } else {
      // Send plain message
      await targetChannel.send(message);
      const replyMsg = await interaction.reply({ content: `✅ Message sent to ${targetChannel}!`, flags: [4096] });
      setTimeout(async () => {
        try { await interaction.deleteReply(); } catch {}
      }, 5000);
    }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = { 
        content: '❌ Failed to send the message. Check bot permissions.', 
        flags: [4096]
      };
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
