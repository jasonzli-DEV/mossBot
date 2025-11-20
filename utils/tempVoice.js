const { ChannelType } = require('discord.js');
const TempVoice = require('../schemas/TempVoice');
const BotConfig = require('../schemas/BotConfig');

// Handle voice state updates for temp voice channels
async function handleVoiceStateUpdate(oldState, newState) {
  try {
    const guild = newState.guild;
    const member = newState.member;

    // Get bot config
    const config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
    if (!config || !config.tempVoiceCreatorChannelId) return;

    const creatorChannelId = config.tempVoiceCreatorChannelId;

    // User joined the creator channel
    if (newState.channelId === creatorChannelId && !oldState.channelId) {
      await createTempVoiceChannel(newState, creatorChannelId);
    }

    // User left a channel
    if (oldState.channelId && !newState.channelId) {
      await deleteTempVoiceChannel(oldState.channelId, guild);
    }

    // User switched channels
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      // Check if they joined the creator channel
      if (newState.channelId === creatorChannelId) {
        await createTempVoiceChannel(newState, creatorChannelId);
      }
      
      // Check if their old channel should be deleted
      await deleteTempVoiceChannel(oldState.channelId, guild);
    }
  } catch (error) {
    console.error('Error handling voice state update:', error);
  }
}

// Create a temporary voice channel
async function createTempVoiceChannel(voiceState, creatorChannelId) {
  try {
    const guild = voiceState.guild;
    const member = voiceState.member;
    const creatorChannel = guild.channels.cache.get(creatorChannelId);

    if (!creatorChannel) return;

    // Create the temp channel in the same category
    const tempChannel = await guild.channels.create({
      name: `${member.user.username}'s channel`,
      type: ChannelType.GuildVoice,
      parent: creatorChannel.parentId,
      userLimit: creatorChannel.userLimit || 0,
      bitrate: creatorChannel.bitrate,
      permissionOverwrites: [
        {
          id: member.id,
          allow: ['ManageChannels', 'MoveMembers', 'Connect', 'Speak'],
        },
        ...creatorChannel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id,
          allow: overwrite.allow.toArray(),
          deny: overwrite.deny.toArray(),
        })),
      ],
    });

    // Save to database
    await TempVoice.create({
      guildId: guild.id,
      channelId: tempChannel.id,
      ownerId: member.id,
    });

    // Move the user to their new channel
    await member.voice.setChannel(tempChannel);

    console.log(`🎤 Created temp voice channel for ${member.user.tag}`);
  } catch (error) {
    console.error('Error creating temp voice channel:', error);
  }
}

// Delete a temporary voice channel if empty
async function deleteTempVoiceChannel(channelId, guild) {
  try {
    // Check if this is a temp voice channel
    const tempVoice = await TempVoice.findOne({ channelId, guildId: guild.id }).maxTimeMS(5000);
    if (!tempVoice) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      // Channel already deleted, remove from DB
      await TempVoice.deleteOne({ channelId });
      return;
    }

    // Check if channel is empty
    if (channel.members.size === 0) {
      await channel.delete('Temp voice channel is empty');
      await TempVoice.deleteOne({ channelId });
      console.log(`🎤 Deleted empty temp voice channel: ${channel.name}`);
    }
  } catch (error) {
    console.error('Error deleting temp voice channel:', error);
  }
}

module.exports = {
  handleVoiceStateUpdate,
};
