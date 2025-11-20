const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-tempvoice')
    .setDescription('Set the temp voice creator channel (Moderators only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The voice channel to use as the creator')
        .addChannelTypes(ChannelType.GuildVoice)
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
          tempVoiceCreatorChannelId: channel.id,
        });
      } else {
        config.tempVoiceCreatorChannelId = channel.id;
        await config.save();
      }

      await interaction.reply({
        content: `✅ Temp voice creator channel set to ${channel}!\n\nUsers who join this channel will get their own temporary voice channel created.`,
        flags: [4096]
      });

      console.log(`🎤 Temp voice creator channel set to ${channel.name} in ${guild.name}`);

    } catch (error) {
      console.error('Error setting temp voice channel:', error);
      await interaction.reply({
        content: '❌ Failed to set temp voice channel. Please try again.',
        flags: [4096]
      });
    }
  },
};
