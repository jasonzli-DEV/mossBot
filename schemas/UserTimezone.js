const mongoose = require('mongoose');

const userTimezoneSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  timezone: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

userTimezoneSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserTimezone', userTimezoneSchema);
