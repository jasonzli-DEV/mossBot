const UserActivity = require('../schemas/UserActivity');
const BotConfig = require('../schemas/BotConfig');
const LinkedAccount = require('../schemas/LinkedAccount');

// Track if daily reset already happened today
let lastResetDate = null;

// Increment online user activity times every 30 seconds
async function incrementOnlineActivityTimes(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      // Only consider linked users
      const linkedAccounts = await LinkedAccount.find({ guildId: guild.id }).maxTimeMS(10000);
      const linkedUserIds = linkedAccounts.map(la => la.userId);
      
      if (linkedUserIds.length === 0) continue;
      
      // Find all online activities and increment by 30 seconds (30000ms)
      await UserActivity.updateMany(
        {
          guildId: guild.id,
          userId: { $in: linkedUserIds },
          status: 'online',
        },
        {
          $inc: {
            dailyOnlineTime: 30000,
            weeklyOnlineTime: 30000,
            monthlyOnlineTime: 30000,
            totalOnlineTime: 30000,
          }
        }
      ).maxTimeMS(10000);
    }
  } catch (error) {
    console.error('Error incrementing online activity times:', error);
  }
}

function scheduleOnlineActivityIncrement(client) {
  // Increment every 30 seconds to reduce DB load
  setInterval(() => {
    incrementOnlineActivityTimes(client);
  }, 30000);
  console.log('⏰ Online activity increment scheduler initialized (every 30s)');
}

// Reset daily activity for all users at midnight Eastern Time
async function resetDailyActivity(client) {
  try {
    const now = new Date();
    
    // For online users, reset their session start to now so yesterday's time isn't counted
    await UserActivity.updateMany(
      { status: 'online' },
      {
        $set: {
          dailyOnlineTime: 0,
          lastDailyReset: now,
          currentSessionStart: now, // Reset session start so today's time starts fresh
        },
      }
    );
    
    // For offline users, just reset daily time
    const result = await UserActivity.updateMany(
      { status: 'offline' },
      {
        $set: {
          dailyOnlineTime: 0,
          lastDailyReset: now,
        },
      }
    );

    console.log(`🕛 Daily activity reset completed`);
  } catch (error) {
    console.error('Error resetting daily activity:', error);
  }
}

// Check for inactive users and send warnings
async function checkInactiveUsers(client) {
  try {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Get all guilds
    for (const guild of client.guilds.cache.values()) {
      // Get config for moderator channel
      const config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
      
      if (!config || !config.moderatorChannelId) {
        continue; // Skip if no moderator channel set
      }

      const moderatorChannel = guild.channels.cache.get(config.moderatorChannelId);
      if (!moderatorChannel) continue;

      // Get all linked accounts for this guild
      const linkedAccounts = await LinkedAccount.find({ guildId: guild.id }).maxTimeMS(5000);
      const linkedUserIds = linkedAccounts.map(la => la.userId);

      // Get all user activities for linked users in this guild
      const activities = await UserActivity.find({ 
        guildId: guild.id,
        userId: { $in: linkedUserIds }
      }).maxTimeMS(10000);

      for (const activity of activities) {
        const lastOnlineTime = activity.lastOnline ? activity.lastOnline.getTime() : 0;
        const timeSinceOnline = now - lastOnlineTime;

        // Only check users who have been inactive for at least 1 week
        if (timeSinceOnline < oneWeek) continue;

        // Calculate weeks inactive
        const weeksInactive = Math.floor(timeSinceOnline / oneWeek);

        // Try to get the member
        const member = await guild.members.fetch(activity.userId).catch(() => null);
        if (!member) continue;

        // Send DM to user
        try {
          const linkedAccount = linkedAccounts.find(la => la.userId === activity.userId);
          const mcName = linkedAccount ? linkedAccount.minecraftUsername : 'your linked account';
          
          await member.send(
            `⏰ **Inactivity Reminder**\n\n` +
            `You haven't been online in **${weeksInactive} week${weeksInactive > 1 ? 's' : ''}** in **${guild.name}**!\n\n` +
            `Your linked Minecraft account: **${mcName}**\n\n` +
            `Stay active to remain part of the community! 🎮`
          );
        } catch (error) {
          // User has DMs disabled or bot can't DM them
        }

        // Send notification to moderator channel
        await moderatorChannel.send(
          `⚠️ **Inactivity Warning**\n\n` +
          `${member} has been inactive for **${weeksInactive} week${weeksInactive > 1 ? 's' : ''}**\n` +
          `Last online: ${activity.lastOnline ? `<t:${Math.floor(activity.lastOnline.getTime() / 1000)}:R>` : 'Never'}`
        );

        // Update last warning time (add to schema later if you want to track this)
        console.log(`⚠️ Sent inactivity warning for ${member.user.tag} (${weeksInactive} weeks)`);
      }
    }
  } catch (error) {
    console.error('Error checking inactive users:', error);
  }
}

// Schedule midnight Eastern Time check
function scheduleMidnightReset(client) {
  // Check every minute if it's midnight ET
  setInterval(() => {
    const now = new Date();
    
    // Convert to Eastern Time
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayDate = etTime.toDateString();
    
    // Check if it's midnight (00:00) in ET and we haven't reset today
    if (etTime.getHours() === 0 && lastResetDate !== todayDate) {
      lastResetDate = todayDate;
      resetDailyActivity(client);
    }
  }, 60 * 1000); // Check every minute

  console.log('🕛 Midnight ET reset scheduler initialized');
}

// Schedule weekly inactivity check (every day at noon ET)
function scheduleInactivityCheck(client) {
  // Check every hour
  setInterval(async () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Run at noon ET every day
    if (etTime.getHours() === 12 && etTime.getMinutes() === 0) {
      await checkInactiveUsers(client);
    }
  }, 60 * 60 * 1000); // Check every hour

  console.log('⏰ Weekly inactivity check scheduler initialized');
}

module.exports = {
  resetDailyActivity,
  checkInactiveUsers,
  scheduleMidnightReset,
  scheduleInactivityCheck,
  scheduleOnlineActivityIncrement,
};
