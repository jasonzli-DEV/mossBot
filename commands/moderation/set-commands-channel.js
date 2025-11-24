const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const BotConfig = require('../../schemas/BotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-commands-channel')
    .setDescription('Set the channel where commands must be used (Moderators only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel for bot commands (leave empty to disable)')
        .addChannelTypes(ChannelType.GuildText)
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

    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;

    try {
      // Get or create config
      let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
      
      if (!config) {
        config = await BotConfig.create({
          guildId: guild.id,
          commandsChannelId: channel ? channel.id : null,
        });
      } else {
        config.commandsChannelId = channel ? channel.id : null;
        await config.save();
      }

      if (channel) {
        await interaction.reply({
          content: `✅ Commands channel set to ${channel}!\n\nUsers must use bot commands in this channel (moderators are exempt).`,
          flags: [4096]
        });
        console.log(`⚙️ Commands channel set to ${channel.name} in ${guild.name}`);
      } else {
        await interaction.reply({
          content: '✅ Commands channel restriction removed! Users can now use commands in any channel.',
          flags: [4096]
        });
        console.log(`⚙️ Commands channel restriction removed in ${guild.name}`);
      }

    } catch (error) {
      console.error('Error setting commands channel:', error);
      await interaction.reply({
        content: '❌ Failed to set commands channel. Please try again.',
        flags: [4096]
      });
    }
  },
};
