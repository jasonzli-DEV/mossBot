const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  moderatorId: {
    type: String,
    required: true,
  },
  moderatorTag: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  targetTag: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['ban', 'kick', 'warn', 'mute', 'unmute', 'role-add', 'role-remove'],
    required: true,
  },
  reason: {
    type: String,
    default: 'No reason provided',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  additionalInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
