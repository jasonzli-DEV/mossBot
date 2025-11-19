const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  lastOnline: {
    type: Date,
    default: Date.now,
  },
  lastOffline: {
    type: Date,
    default: null,
  },
  currentSessionStart: {
    type: Date,
    default: null,
  },
  // Total time tracking
  totalOnlineTime: {
    type: Number,
    default: 0, // in milliseconds
  },
  // Daily tracking
  dailyOnlineTime: {
    type: Number,
    default: 0,
  },
  lastDailyReset: {
    type: Date,
    default: Date.now,
  },
  // Weekly tracking
  weeklyOnlineTime: {
    type: Number,
    default: 0,
  },
  lastWeeklyReset: {
    type: Date,
    default: Date.now,
  },
  // Monthly tracking
  monthlyOnlineTime: {
    type: Number,
    default: 0,
  },
  lastMonthlyReset: {
    type: Date,
    default: Date.now,
  },
  sessionCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique user per guild
userActivitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);
