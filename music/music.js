const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');

let connection = null;
let player = null;

/**
 * Initialize and start music playback automatically
 * This runs on bot startup and cannot be stopped
 */
async function initializeMusic(client) {
  const channelId = process.env.MusicChannelID;

  if (!channelId) {
    console.log('⚠️  MusicChannelID not configured, skipping auto-music');
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isVoiceBased()) {
    console.log('❌ Music channel not found or is not a voice channel');
    return;
  }

  // Check if music file exists
  const musicPath = path.join(__dirname, 'music.opus');
  if (!fs.existsSync(musicPath)) {
    console.log('❌ Music file not found at music/music.opus');
    return;
  }

  try {
    // Join voice channel
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Create audio player
    player = createAudioPlayer();

    // Function to play music
    const playMusic = () => {
      const resource = createAudioResource(musicPath);
      player.play(resource);
      console.log('🎵 Music playing...');
    };

    // Start playing
    playMusic();

    // Subscribe connection to player
    connection.subscribe(player);

    // Auto-loop: restart music when it ends
    player.on(AudioPlayerStatus.Idle, () => {
      playMusic();
    });

    // Handle errors and restart
    player.on('error', error => {
      console.error('❌ Audio player error:', error);
      setTimeout(() => playMusic(), 5000);
    });

    // Handle disconnections and reconnect
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        console.log('🎵 Disconnected, attempting to reconnect...');
        setTimeout(() => initializeMusic(client), 5000);
      }
    });

    console.log(`🎵 Auto-music started in ${channel.name} (looping forever)`);

  } catch (error) {
    console.error('Error starting auto-music:', error);
    // Retry after 10 seconds
    setTimeout(() => initializeMusic(client), 10000);
  }
}

module.exports = { initializeMusic };
