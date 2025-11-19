const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  activityDashboardMessageId: {
    type: String,
    default: null,
  },
  activityDashboardChannelId: {
    type: String,
    default: null,
  },
  botStatus: {
    type: {
      type: String,
      enum: ['playing', 'listening', 'watching', 'competing', 'streaming'],
      default: 'playing',
    },
    text: {
      type: String,
      default: 'with commands | /help',
    },
    url: {
      type: String,
      default: null,
    },
  },
  musicChannelId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
