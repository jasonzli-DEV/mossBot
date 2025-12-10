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
        .setDescription('Embed color (hex, e.g. FF0000, optional)')
        .setRequired(false)
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
    if (colorOption) {
      // Send embed with specified color
      let color = null;
      try {
        color = parseInt(colorOption, 16);
      } catch {
        color = null;
      }
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
