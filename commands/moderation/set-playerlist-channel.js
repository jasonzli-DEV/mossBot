const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-playerlist-channel')
    .setDescription('Set the channel where the player list bot sends updates (Moderators only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where player list messages are sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
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

    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;

    try {
      // Get or create config
      let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
      
      if (!config) {
        config = await BotConfig.create({
          guildId: guild.id,
          playerListChannelId: channel.id,
        });
      } else {
        config.playerListChannelId = channel.id;
        await config.save();
      }

      await interaction.reply({
        content: `✅ Player list channel set to ${channel}!\n\nThe bot will now monitor this channel for player list updates from the external bot.`,
        flags: [4096]
      });

      console.log(`⚙️ Player list channel set to ${channel.name} in ${guild.name}`);

    } catch (error) {
      console.error('Error setting player list channel:', error);
      await interaction.reply({
        content: '❌ Failed to set player list channel. Please try again.',
        flags: [4096]
      });
    }
  },
};
