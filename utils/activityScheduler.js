const UserActivity = require('../schemas/UserActivity');
const BotConfig = require('../schemas/BotConfig');
const LinkedAccount = require('../schemas/LinkedAccount');
const { checkAndResetPeriods } = require('./activityTracker');

// Track if daily reset already happened today
let lastResetDate = null;
let lastWeeklyResetDate = null;
let lastMonthlyResetDate = null;

// Check and perform any missed resets on startup
async function checkMissedResets(client) {
  try {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayDate = etTime.toDateString();
    
    console.log('🔍 Checking for missed resets...');
    
    // Check all users for missed resets
    const activities = await UserActivity.find({});
    
    for (const activity of activities) {
      let needsSave = false;
      
      // Check if daily reset was missed
      if (activity.lastDailyReset) {
        const lastDailyET = new Date(activity.lastDailyReset.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        if (lastDailyET.toDateString() !== todayDate) {
          activity.dailyOnlineTime = 0;
          activity.lastDailyReset = now;
          needsSave = true;
          console.log(`  📅 Missed daily reset for ${activity.username}`);
        }
      }
      
      // Check if weekly reset was missed (if it's past Monday and last reset was before this Monday)
      if (activity.lastWeeklyReset) {
        const lastWeeklyET = new Date(activity.lastWeeklyReset.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const daysSinceReset = Math.floor((etTime - lastWeeklyET) / (24 * 60 * 60 * 1000));
        
        // If more than 7 days since last weekly reset, reset it
        if (daysSinceReset >= 7) {
          activity.weeklyOnlineTime = activity.dailyOnlineTime; // Keep today's progress
          activity.lastWeeklyReset = now;
          needsSave = true;
          console.log(`  📅 Missed weekly reset for ${activity.username}`);
        }
      }
      
      // Check if monthly reset was missed
      if (activity.lastMonthlyReset) {
        const lastMonthlyET = new Date(activity.lastMonthlyReset.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        if (lastMonthlyET.getMonth() !== etTime.getMonth() || lastMonthlyET.getFullYear() !== etTime.getFullYear()) {
          activity.monthlyOnlineTime = activity.weeklyOnlineTime; // Keep this week's progress
          activity.lastMonthlyReset = now;
          needsSave = true;
          console.log(`  📅 Missed monthly reset for ${activity.username}`);
        }
      }
      
      if (needsSave) {
        await activity.save();
      }
    }
    
    // Set the tracking variables to today so we don't reset again
    lastResetDate = todayDate;
    lastWeeklyResetDate = todayDate;
    lastMonthlyResetDate = todayDate;
    
    console.log('✅ Missed reset check completed');
  } catch (error) {
    console.error('Error checking missed resets:', error);
  }
}

// Increment online user activity times every 30 seconds
async function incrementOnlineActivityTimes(client) {
  try {
    const MAX_WEEKLY_MS = 7 * 24 * 60 * 60 * 1000; // 168 hours max
    
    for (const guild of client.guilds.cache.values()) {
      // Only consider linked users
      const linkedAccounts = await LinkedAccount.find({ guildId: guild.id }).maxTimeMS(10000);
      const linkedUserIds = linkedAccounts.map(la => la.userId);
      
      if (linkedUserIds.length === 0) continue;
      
      // Find all online activities
      const onlineActivities = await UserActivity.find({
        guildId: guild.id,
        userId: { $in: linkedUserIds },
        status: 'online',
      }).maxTimeMS(10000);
      
      for (const activity of onlineActivities) {
        // Increment times
        activity.dailyOnlineTime += 30000;
        activity.weeklyOnlineTime += 30000;
        activity.monthlyOnlineTime += 30000;
        activity.totalOnlineTime += 30000;
        
        // If weekly exceeds max, push overflow to monthly and cap weekly
        if (activity.weeklyOnlineTime > MAX_WEEKLY_MS) {
          const overflow = activity.weeklyOnlineTime - MAX_WEEKLY_MS;
          activity.monthlyOnlineTime += overflow;
          activity.weeklyOnlineTime = MAX_WEEKLY_MS;
        }
        
        await activity.save();
      }
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

// Reset weekly activity for all users at Monday midnight Eastern Time
async function resetWeeklyActivity(client) {
  try {
    const now = new Date();
    
    // Reset weekly time for all users
    await UserActivity.updateMany(
      {},
      {
        $set: {
          weeklyOnlineTime: 0,
          lastWeeklyReset: now,
        },
      }
    );

    console.log(`📅 Weekly activity reset completed`);
  } catch (error) {
    console.error('Error resetting weekly activity:', error);
  }
}

// Reset monthly activity for all users at 1st of month midnight Eastern Time
async function resetMonthlyActivity(client) {
  try {
    const now = new Date();
    
    // Reset monthly time for all users
    await UserActivity.updateMany(
      {},
      {
        $set: {
          monthlyOnlineTime: 0,
          lastMonthlyReset: now,
        },
      }
    );

    console.log(`📆 Monthly activity reset completed`);
  } catch (error) {
    console.error('Error resetting monthly activity:', error);
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
    const dayOfWeek = etTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = etTime.getDate();
    
    // Check if it's within the first 5 minutes after midnight (00:00-00:04) in ET
    // This gives a 5-minute window to catch the reset
    if (etTime.getHours() === 0 && etTime.getMinutes() < 5) {
      // Daily reset (every day at midnight)
      if (lastResetDate !== todayDate) {
        lastResetDate = todayDate;
        resetDailyActivity(client);
      }
      
      // Weekly reset (every Monday at midnight)
      if (dayOfWeek === 1 && lastWeeklyResetDate !== todayDate) {
        lastWeeklyResetDate = todayDate;
        resetWeeklyActivity(client);
      }
      
      // Monthly reset (1st of month at midnight)
      if (dayOfMonth === 1 && lastMonthlyResetDate !== todayDate) {
        lastMonthlyResetDate = todayDate;
        resetMonthlyActivity(client);
      }
    }
  }, 60 * 1000); // Check every minute

  console.log('🕛 Midnight ET reset scheduler initialized (daily, weekly, monthly)');
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
  resetWeeklyActivity,
  resetMonthlyActivity,
  checkInactiveUsers,
  checkMissedResets,
  scheduleMidnightReset,
  scheduleInactivityCheck,
  scheduleOnlineActivityIncrement,
};
