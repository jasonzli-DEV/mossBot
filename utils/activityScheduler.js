// Increment online user activity times every second
async function incrementOnlineActivityTimes(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      // Only consider linked users
      const linkedAccounts = await LinkedAccount.find({ guildId: guild.id }).maxTimeMS(5000);
      const linkedUserIds = linkedAccounts.map(la => la.userId);
      // Find all online activities
      const onlineActivities = await UserActivity.find({
        guildId: guild.id,
        userId: { $in: linkedUserIds },
        status: 'online',
      }).maxTimeMS(10000);
      for (const activity of onlineActivities) {
        activity.dailyOnlineTime = (activity.dailyOnlineTime || 0) + 1000;
        activity.weeklyOnlineTime = (activity.weeklyOnlineTime || 0) + 1000;
        activity.monthlyOnlineTime = (activity.monthlyOnlineTime || 0) + 1000;
        activity.totalOnlineTime = (activity.totalOnlineTime || 0) + 1000;
        await activity.save();
      }
    }
  } catch (error) {
    console.error('Error incrementing online activity times:', error);
  }
}

function scheduleOnlineActivityIncrement(client) {
  setInterval(() => {
    incrementOnlineActivityTimes(client);
  }, 1000);
  console.log('⏰ Online activity increment scheduler initialized');
}
const UserActivity = require('../schemas/UserActivity');
const BotConfig = require('../schemas/BotConfig');
const LinkedAccount = require('../schemas/LinkedAccount');

// Reset daily activity for all users at midnight Eastern Time
async function resetDailyActivity(client) {
  try {
    const result = await UserActivity.updateMany(
      {},
      {
        $set: {
          dailyOnlineTime: 0,
          lastDailyReset: new Date(),
        },
      }
    );

    console.log(`🕛 Daily activity reset for ${result.modifiedCount} users`);
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
    
    // Check if it's midnight (00:00) in ET
    if (etTime.getHours() === 0 && etTime.getMinutes() === 0) {
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
