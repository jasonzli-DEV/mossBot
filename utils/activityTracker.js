const { EmbedBuilder } = require('discord.js');
const UserActivity = require('../schemas/UserActivity');
const BotConfig = require('../schemas/BotConfig');
const LinkedAccount = require('../schemas/LinkedAccount');

// Helper function to format time
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Helper to get date parts in Eastern Time
function getETDateParts(date) {
  const etDateStr = new Date(date).toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etDateStr);
  return {
    year: etDate.getFullYear(),
    month: etDate.getMonth(),
    day: etDate.getDate(),
    dayOfWeek: etDate.getDay()
  };
}

// Helper to get week number in Eastern Time
function getETWeekNumber(date) {
  const parts = getETDateParts(date);
  const etDate = new Date(parts.year, parts.month, parts.day);
  etDate.setDate(etDate.getDate() + 3 - ((etDate.getDay() + 6) % 7));
  const week1 = new Date(etDate.getFullYear(), 0, 4);
  return 1 + Math.round(((etDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Reset time periods if needed (all in Eastern Time)
function checkAndResetPeriods(activity) {
  const now = new Date();
  let updated = false;

  // Check daily reset (new day in ET)
  const nowParts = getETDateParts(now);
  const lastDailyParts = getETDateParts(activity.lastDailyReset);
  
  if (nowParts.year !== lastDailyParts.year || 
      nowParts.month !== lastDailyParts.month || 
      nowParts.day !== lastDailyParts.day) {
    activity.dailyOnlineTime = 0;
    activity.lastDailyReset = now;
    updated = true;
  }

  // Check weekly reset (new week in ET)
  const nowWeek = getETWeekNumber(now);
  const lastWeek = getETWeekNumber(activity.lastWeeklyReset);
  
  if (nowWeek !== lastWeek || nowParts.year !== getETDateParts(activity.lastWeeklyReset).year) {
    activity.weeklyOnlineTime = 0;
    activity.lastWeeklyReset = now;
    updated = true;
  }

  // Check monthly reset (new month in ET)
  if (nowParts.year !== lastDailyParts.year || nowParts.month !== getETDateParts(activity.lastMonthlyReset).month) {
    activity.monthlyOnlineTime = 0;
    activity.lastMonthlyReset = now;
    updated = true;
  }

  return updated;
}

// Update activity dashboard message
async function updateActivityDashboard(client) {
  const channelId = process.env.ActivityTrackerChannelID;

  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  try {
    // Get guild and bot config
    const guild = client.guilds.cache.first();
    if (!guild) return;

    let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
    
    // Create config if it doesn't exist
    if (!config) {
      config = await BotConfig.create({
        guildId: guild.id,
        activityDashboardChannelId: channelId,
      });
    }

    // Get only linked users' activities
    const linkedAccounts = await LinkedAccount.find({ guildId: guild.id }).maxTimeMS(5000);
    const linkedUserIds = linkedAccounts.map(la => la.userId);

    const activities = await UserActivity.find({ 
      guildId: guild.id,
      userId: { $in: linkedUserIds }
    })
      .sort({ status: -1, monthlyOnlineTime: -1 })
      .limit(20)
      .maxTimeMS(5000);

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Activity Dashboard')
      .setDescription('Real-time Minecraft activity tracking for linked members\nUse `/link` to link your Minecraft account!')
      .setTimestamp()
      .setFooter({ text: 'Last updated' });

    if (activities.length === 0) {
      embed.addFields({ 
        name: 'No Activity Data', 
        value: 'No linked members have played yet.\nUse `/link <minecraft_username>` to start tracking!',
        inline: false 
      });
    } else {
      let onlineUsers = '';
      let offlineUsers = '';

      for (const activity of activities) {
        const statusIcon = activity.status === 'online' ? '🟢' : '🔴';
        
        // Get member for display name
        const member = await guild.members.fetch(activity.userId).catch(() => null);
        const displayName = member ? member.displayName : activity.username;
        
        // Get linked account for Minecraft username
        const linkedAccount = linkedAccounts.find(la => la.userId === activity.userId);
        const minecraftName = linkedAccount ? linkedAccount.minecraftUsername : activity.minecraftUsername || 'Unknown';
        
        // Format: DisplayName | MinecraftIGN
        const formattedName = `${displayName} | ${minecraftName}`;

        // Display times directly from database (increment scheduler handles updates)
        const dayTime = formatTime(activity.dailyOnlineTime);
        const weekTime = formatTime(activity.weeklyOnlineTime);
        const monthTime = formatTime(activity.monthlyOnlineTime);

        const userLine = `${statusIcon} **${formattedName}**\n` +
                        `└ Day: ${dayTime} | Week: ${weekTime} | Month: ${monthTime}\n\n`;

        if (activity.status === 'online') {
          onlineUsers += userLine;
        } else {
          offlineUsers += userLine;
        }
      }

      if (onlineUsers) {
        embed.addFields({ 
          name: '🟢 Online Members', 
          value: onlineUsers || 'None',
          inline: false 
        });
      }

      if (offlineUsers) {
        embed.addFields({ 
          name: '🔴 Offline Members', 
          value: offlineUsers || 'None',
          inline: false 
        });
      }
    }

    // Try to edit existing message, or create new one
    if (config.activityDashboardMessageId) {
      const message = await channel.messages.fetch(config.activityDashboardMessageId).catch(() => null);
      
      if (message) {
        await message.edit({ embeds: [embed] });
        return;
      } else {
        // Message was deleted, create a new one
        console.log('📊 Activity dashboard message was deleted, creating a new one...');
      }
    }

    // Create new message if no existing message found or it was deleted
    const newMessage = await channel.send({ embeds: [embed] });
    
    // Update config with new message ID
    config.activityDashboardMessageId = newMessage.id;
    config.activityDashboardChannelId = channelId;
    await config.save();
    
    console.log(`📊 Activity dashboard created/updated with message ID: ${newMessage.id}`);

  } catch (error) {
    console.error('Error updating activity dashboard:', error);
  }
}

// Update user activity
async function updateUserActivity(guildId, userId, username, isOnline) {
  try {
    let activity = await UserActivity.findOne({ guildId, userId }).maxTimeMS(5000);

    if (!activity) {
      activity = new UserActivity({
        guildId,
        userId,
        username,
        status: isOnline ? 'online' : 'offline',
        currentSessionStart: isOnline ? new Date() : null,
      });
    } else {
      // Check and reset periods
      checkAndResetPeriods(activity);

      // Update activity based on status change
      if (isOnline && activity.status === 'offline') {
        // Going online
        activity.status = 'online';
        activity.lastOnline = new Date();
        activity.currentSessionStart = new Date();
        activity.sessionCount += 1;
      } else if (!isOnline && activity.status === 'online') {
        // Going offline
        const sessionTime = Date.now() - new Date(activity.currentSessionStart).getTime();
        
        activity.status = 'offline';
        activity.lastOffline = new Date();
        activity.totalOnlineTime += sessionTime;
        activity.dailyOnlineTime += sessionTime;
        activity.weeklyOnlineTime += sessionTime;
        activity.monthlyOnlineTime += sessionTime;
        activity.currentSessionStart = null;
      }

      activity.username = username; // Update username in case it changed
    }

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error updating user activity:', error);
    throw error;
  }
}

module.exports = {
  updateActivityDashboard,
  updateUserActivity,
  formatTime,
  checkAndResetPeriods,
};
