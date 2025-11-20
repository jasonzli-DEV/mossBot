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
  serverStatusMessageId: {
    type: String,
    default: null,
  },
  serverStatusChannelId: {
    type: String,
    default: null,
  },
  ticketPanelMessageId: {
    type: String,
    default: null,
  },
  ticketPanelChannelId: {
    type: String,
    default: null,
  },
  ticketCategoryId: {
    type: String,
    default: null,
  },
  ticketCounter: {
    type: Number,
    default: 0,
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
  tempVoiceCreatorChannelId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
