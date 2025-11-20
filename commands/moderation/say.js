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
    .addBooleanOption(option =>
      option
        .setName('embed')
        .setDescription('Send as an embed (default: false)')
        .setRequired(false)
    ),

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
    const useEmbed = interaction.options.getBoolean('embed') || false;

    // Check if target channel is a text channel
    if (!targetChannel.isTextBased()) {
      return interaction.reply({ 
        content: '❌ You can only send messages to text channels!', 
        flags: [4096]
      });
    }

    try {
      if (useEmbed) {
        // Show color picker for embed
        await interaction.deferReply({ flags: [4096] });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('embed_color_select')
          .setPlaceholder('Choose an embed color')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Blue')
              .setDescription('Discord Blue')
              .setValue('5865F2')
              .setEmoji('🔵'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Green')
              .setDescription('Success Green')
              .setValue('00FF00')
              .setEmoji('🟢'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Red')
              .setDescription('Error Red')
              .setValue('FF0000')
              .setEmoji('🔴'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Yellow')
              .setDescription('Warning Yellow')
              .setValue('FFFF00')
              .setEmoji('🟡'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Purple')
              .setDescription('Royal Purple')
              .setValue('9B59B6')
              .setEmoji('🟣'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Orange')
              .setDescription('Bright Orange')
              .setValue('FF8C00')
              .setEmoji('🟠'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Pink')
              .setDescription('Hot Pink')
              .setValue('FF69B4')
              .setEmoji('🌸'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Black')
              .setDescription('Dark Theme')
              .setValue('000000')
              .setEmoji('⚫'),
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.editReply({
          content: '🎨 Choose an embed color:',
          components: [row],
        });

        // Wait for color selection
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60000,
        });

        collector.on('collect', async (i) => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ 
              content: '❌ This menu is not for you!', 
              flags: [4096]
            });
          }

          const color = parseInt(i.values[0], 16);

          // Create and send embed
          const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor(color)
            .setTimestamp();

          await targetChannel.send({ embeds: [embed] });

          await i.update({
            content: `✅ Embed sent to ${targetChannel}!`,
            components: [],
          });

          collector.stop();
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.editReply({
              content: '⏱️ Color selection timed out. Please try again.',
              components: [],
            });
          }
        });

      } else {
        // Send regular message
        await targetChannel.send(message);
        
        await interaction.reply({
          content: `✅ Message sent to ${targetChannel}!`,
          flags: [4096]
        });
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
