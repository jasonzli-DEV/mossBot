const { EmbedBuilder } = require('discord.js');
const UserActivity = require('../schemas/UserActivity');
const BotConfig = require('../schemas/BotConfig');

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

// Reset time periods if needed
function checkAndResetPeriods(activity) {
  const now = new Date();
  let updated = false;

  // Check daily reset (new day)
  const lastDaily = new Date(activity.lastDailyReset);
  if (now.getDate() !== lastDaily.getDate() || 
      now.getMonth() !== lastDaily.getMonth() || 
      now.getFullYear() !== lastDaily.getFullYear()) {
    activity.dailyOnlineTime = 0;
    activity.lastDailyReset = now;
    updated = true;
  }

  // Check weekly reset (new week - Sunday)
  const lastWeekly = new Date(activity.lastWeeklyReset);
  const weeksDiff = Math.floor((now - lastWeekly) / (7 * 24 * 60 * 60 * 1000));
  if (weeksDiff >= 1) {
    activity.weeklyOnlineTime = 0;
    activity.lastWeeklyReset = now;
    updated = true;
  }

  // Check monthly reset (new month)
  const lastMonthly = new Date(activity.lastMonthlyReset);
  if (now.getMonth() !== lastMonthly.getMonth() || 
      now.getFullYear() !== lastMonthly.getFullYear()) {
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

    const activities = await UserActivity.find({ guildId: guild.id })
      .sort({ status: -1, monthlyOnlineTime: -1 })
      .limit(20)
      .maxTimeMS(5000);

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Activity Dashboard')
      .setDescription('Real-time activity tracking for server members')
      .setTimestamp()
      .setFooter({ text: 'Last updated' });

    if (activities.length === 0) {
      embed.addFields({ 
        name: 'No Activity Data', 
        value: 'No members have checked in yet. Use `/online` to start tracking!',
        inline: false 
      });
    } else {
      let onlineUsers = '';
      let offlineUsers = '';

      for (const activity of activities) {
        const statusIcon = activity.status === 'online' ? '🟢' : '🔴';
        const user = await client.users.fetch(activity.userId).catch(() => null);
        const username = user ? user.tag : activity.username;

        // Calculate current session time if online
        let currentTime = 0;
        if (activity.status === 'online' && activity.currentSessionStart) {
          currentTime = Date.now() - new Date(activity.currentSessionStart).getTime();
        }

        const dayTime = formatTime(activity.dailyOnlineTime + currentTime);
        const weekTime = formatTime(activity.weeklyOnlineTime + currentTime);
        const monthTime = formatTime(activity.monthlyOnlineTime + currentTime);

        const userLine = `${statusIcon} **${username}**\n` +
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
