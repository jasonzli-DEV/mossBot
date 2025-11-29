const mongoose = require('mongoose');

const linkedAccountSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  minecraftUsername: {
    type: String,
    required: true,
  },
  // Store lowercase version for case-insensitive matching
  minecraftUsernameLower: {
    type: String,
    required: true,
  },
  linkedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient lookups
linkedAccountSchema.index({ guildId: 1, userId: 1 }, { unique: true });
linkedAccountSchema.index({ guildId: 1, minecraftUsernameLower: 1 }, { unique: true });

module.exports = mongoose.model('LinkedAccount', linkedAccountSchema);
