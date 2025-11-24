const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-moderator-channel')
    .setDescription('Set the channel for moderator notifications (Moderators only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel for moderator notifications')
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
          moderatorChannelId: channel.id,
        });
      } else {
        config.moderatorChannelId = channel.id;
        await config.save();
      }

      await interaction.reply({
        content: `✅ Moderator channel set to ${channel}!\n\nInactivity warnings and other moderator notifications will be sent here.`,
        flags: [4096]
      });

      console.log(`⚙️ Moderator channel set to ${channel.name} in ${guild.name}`);

    } catch (error) {
      console.error('Error setting moderator channel:', error);
      await interaction.reply({
        content: '❌ Failed to set moderator channel. Please try again.',
        flags: [4096]
      });
    }
  },
};
