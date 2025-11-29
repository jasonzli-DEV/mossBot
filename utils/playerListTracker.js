const BotConfig = require('../schemas/BotConfig');
const UserActivity = require('../schemas/UserActivity');
const { updateActivityDashboard } = require('./activityTracker');

let isProcessingPlayerList = false;
let currentPlayerList = [];
let collectingPlayers = false;

// Parse player names from message content
function parsePlayerNames(content) {
  // Split by comma and clean up each name
  return content
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0 && !name.includes('----'));
}

// Find Discord member by Minecraft username (matched via nickname)
function findMemberByMinecraftName(guild, minecraftName) {
  // Check nicknames first (case-insensitive)
  const memberByNick = guild.members.cache.find(member => 
    member.nickname && member.nickname.toLowerCase() === minecraftName.toLowerCase()
  );
  
  if (memberByNick) return memberByNick;
  
  // Fallback to username check
  const memberByUsername = guild.members.cache.find(member =>
    member.user.username.toLowerCase() === minecraftName.toLowerCase()
  );
  
  return memberByUsername;
}

// Process the collected player list
async function processPlayerList(guild, playerNames, client) {
  try {
    const now = new Date();
    const onlineUserIds = new Set();

    // Make sure we have all guild members cached
    await guild.members.fetch();

    // Find Discord members for each player
    for (const playerName of playerNames) {
      const member = findMemberByMinecraftName(guild, playerName);
      
      // Only track if member exists in the guild and is not a bot
      if (member && member.guild.id === guild.id && !member.user.bot) {
        onlineUserIds.add(member.id);
        
        // Update or create user activity
        let activity = await UserActivity.findOne({
          guildId: guild.id,
          userId: member.id,
        }).maxTimeMS(5000);

        if (!activity) {
          activity = await UserActivity.create({
            guildId: guild.id,
            userId: member.id,
            status: 'online',
            lastOnline: now,
            currentSessionStart: now,
          });
        } else {
          // If user was offline, start new session
          if (activity.status === 'offline') {
            activity.status = 'online';
            activity.currentSessionStart = now;
          }
          activity.lastOnline = now;
          await activity.save();
        }
      }
    }

    // Mark users as offline if they're not in the player list
    const allActivities = await UserActivity.find({
      guildId: guild.id,
      status: 'online',
    }).maxTimeMS(10000);

    for (const activity of allActivities) {
      if (!onlineUserIds.has(activity.userId)) {
        // User is no longer online, calculate session time
        if (activity.currentSessionStart) {
          const sessionDuration = now - activity.currentSessionStart;
          const sessionMinutes = Math.floor(sessionDuration / (1000 * 60));
          
          activity.dailyOnlineTime = (activity.dailyOnlineTime || 0) + sessionMinutes;
          activity.weeklyOnlineTime = (activity.weeklyOnlineTime || 0) + sessionMinutes;
          activity.monthlyOnlineTime = (activity.monthlyOnlineTime || 0) + sessionMinutes;
        }
        
        activity.status = 'offline';
        activity.currentSessionStart = null;
        await activity.save();
      }
    }

    // Update the activity dashboard to reflect the changes
    if (client) {
      await updateActivityDashboard(client);
    }

  } catch (error) {
    console.error('Error processing player list:', error);
  }
}

// Handle incoming messages from the player list channel
async function handlePlayerListMessage(message, client) {
  try {
    // Get config
    const config = await BotConfig.findOne({ guildId: message.guild.id }).maxTimeMS(5000);
    
    if (!config || !config.playerListChannelId) return;
    if (message.channel.id !== config.playerListChannelId) return;
    
    // Don't process our own messages
    if (message.author.id === client.user.id) return;

    const content = message.content.trim();

    // Check for start marker
    if (content.includes('----start player list----')) {
      collectingPlayers = true;
      currentPlayerList = [];
      isProcessingPlayerList = true;
      
      // Check if there are players on the same line after the marker
      const afterMarker = content.split('----start player list----')[1];
      if (afterMarker && afterMarker.trim()) {
        const players = parsePlayerNames(afterMarker);
        currentPlayerList.push(...players);
      }
      
      // Update last message ID
      config.lastPlayerListMessageId = message.id;
      await config.save();
      
      return;
    }

    // Check for end marker
    if (content.includes('----end player list----')) {
      // Check if there are players before the marker
      const beforeMarker = content.split('----end player list----')[0];
      if (beforeMarker && beforeMarker.trim()) {
        const players = parsePlayerNames(beforeMarker);
        currentPlayerList.push(...players);
      }
      
      collectingPlayers = false;
      
      // Process the complete player list
      if (currentPlayerList.length > 0 || isProcessingPlayerList) {
        await processPlayerList(message.guild, currentPlayerList, client);
      }
      
      currentPlayerList = [];
      isProcessingPlayerList = false;
      
      return;
    }

    // If we're collecting players, add them to the list
    if (collectingPlayers) {
      const players = parsePlayerNames(content);
      currentPlayerList.push(...players);
    }

  } catch (error) {
    console.error('Error handling player list message:', error);
  }
}

// Initialize player list tracker
function initializePlayerListTracker(client) {
  // Listen for messages
  client.on('messageCreate', async (message) => {
    // Ignore DMs
    if (!message.guild) return;
    
    await handlePlayerListMessage(message, client);
  });

  console.log('📋 Player list tracker initialized');
}

module.exports = {
  initializePlayerListTracker,
  handlePlayerListMessage,
  processPlayerList,
};
