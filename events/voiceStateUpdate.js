const { handleVoiceStateUpdate } = require('../utils/tempVoice');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    await handleVoiceStateUpdate(oldState, newState);
  },
};
