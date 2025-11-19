const mongoose = require('mongoose');

const moderatorSchema = new mongoose.Schema({
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
  addedBy: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique moderator per guild
moderatorSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Moderator', moderatorSchema);
