const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set the bot status (Moderators only)')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('The type of activity')
        .setRequired(true)
        .addChoices(
          { name: '🎮 Playing', value: 'playing' },
          { name: '🎵 Listening', value: 'listening' },
          { name: '📺 Watching', value: 'watching' },
          { name: '🏆 Competing', value: 'competing' },
          { name: '🎬 Streaming', value: 'streaming' }
        )
    )
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The status text to display')
        .setRequired(true)
        .setMaxLength(128)
    )
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('Stream URL (only for streaming type)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Check if user is a moderator
    const userIsMod = await isModerator(interaction.member);
    
    if (!userIsMod) {
      return interaction.reply({ 
        content: '❌ You must be a moderator or administrator to change the bot status!', 
        flags: [4096] 
      });
    }

    const typeInput = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const url = interaction.options.getString('url');

    // Map type to ActivityType
    const activityTypeMap = {
      playing: ActivityType.Playing,
      listening: ActivityType.Listening,
      watching: ActivityType.Watching,
      competing: ActivityType.Competing,
      streaming: ActivityType.Streaming,
    };

    const activityType = activityTypeMap[typeInput];

    try {
      const guild = interaction.guild;

      // Save to database
      let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
      
      if (!config) {
        config = await BotConfig.create({
          guildId: guild.id,
          botStatus: {
            type: typeInput,
            text: text,
            url: url || null,
          },
        });
      } else {
        config.botStatus = {
          type: typeInput,
          text: text,
          url: url || null,
        };
        await config.save();
      }

      // Set the bot status
      if (typeInput === 'streaming' && url) {
        client.user.setActivity(text, { 
          type: activityType,
          url: url 
        });
      } else {
        client.user.setActivity(text, { type: activityType });
      }

      // Get emoji for response
      const emojiMap = {
        playing: '🎮',
        listening: '🎵',
        watching: '📺',
        competing: '🏆',
        streaming: '🎬',
      };

      await interaction.reply({
        content: `✅ Bot status updated and saved to database!\n${emojiMap[typeInput]} **${typeInput.charAt(0).toUpperCase() + typeInput.slice(1)}** ${text}`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error setting bot status:', error);
      await interaction.reply({ 
        content: '❌ Failed to set bot status. Please try again.', 
        flags: [4096] 
      });
    }
  },
};
