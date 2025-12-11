const BotConfig = require('../schemas/BotConfig');
const UserActivity = require('../schemas/UserActivity');
const LinkedAccount = require('../schemas/LinkedAccount');
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

// Find linked Discord user by Minecraft username (exact match, case-insensitive)
async function findLinkedUser(guildId, minecraftName) {
  const linkedAccount = await LinkedAccount.findOne({
    guildId: guildId,
    minecraftUsernameLower: minecraftName.toLowerCase(),
  }).maxTimeMS(5000);
  
  return linkedAccount;
}

// Process the collected player list
async function processPlayerList(guild, playerNames, client) {
  try {
    const now = new Date();
    const onlineUserIds = new Set();

    // Find linked Discord users for each player
    for (const playerName of playerNames) {
      const linkedAccount = await findLinkedUser(guild.id, playerName);
      if (linkedAccount) {
        onlineUserIds.add(linkedAccount.userId);
        let activity = await UserActivity.findOne({
          guildId: guild.id,
          userId: linkedAccount.userId,
        }).maxTimeMS(5000);
        if (!activity) {
          const member = await guild.members.fetch(linkedAccount.userId).catch(() => null);
          const displayName = member ? member.displayName : 'Unknown';
          activity = await UserActivity.create({
            guildId: guild.id,
            userId: linkedAccount.userId,
            username: displayName,
            minecraftUsername: linkedAccount.minecraftUsername,
            status: 'online',
            lastOnline: now,
            currentSessionStart: now,
            totalOnlineTime: 0,
            dailyOnlineTime: 0,
            weeklyOnlineTime: 0,
            monthlyOnlineTime: 0,
            lastDailyReset: now,
            lastWeeklyReset: now,
            lastMonthlyReset: now,
            sessionCount: 1,
          });
        } else {
          if (activity.status === 'offline') {
            activity.status = 'online';
            activity.currentSessionStart = now;
            activity.sessionCount = (activity.sessionCount || 0) + 1;
          }
          activity.lastOnline = now;
          activity.minecraftUsername = linkedAccount.minecraftUsername;
          await activity.save();
        }
      }
    }

    // Mark linked users as offline if they're not in the player list
    // Only check users who have linked accounts
    const allLinkedAccounts = await LinkedAccount.find({
      guildId: guild.id,
    }).maxTimeMS(10000);

    for (const linkedAccount of allLinkedAccounts) {
      let activity = await UserActivity.findOne({
        guildId: guild.id,
        userId: linkedAccount.userId,
      }).maxTimeMS(5000);
      if (!activity) {
        // Create offline activity for users who have never been online
        const member = await guild.members.fetch(linkedAccount.userId).catch(() => null);
        const displayName = member ? member.displayName : 'Unknown';
        activity = await UserActivity.create({
          guildId: guild.id,
          userId: linkedAccount.userId,
          username: displayName,
          minecraftUsername: linkedAccount.minecraftUsername,
          status: 'offline',
          lastOnline: null,
          currentSessionStart: null,
          totalOnlineTime: 0,
          dailyOnlineTime: 0,
          weeklyOnlineTime: 0,
          monthlyOnlineTime: 0,
          lastDailyReset: now,
          lastWeeklyReset: now,
          lastMonthlyReset: now,
          sessionCount: 0,
        });
      }
      if (activity.status === 'online' && !onlineUserIds.has(linkedAccount.userId)) {
        // User is no longer online - just mark offline (increment scheduler handles time)
        activity.status = 'offline';
        activity.currentSessionStart = null;
        activity.lastOffline = now;
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
