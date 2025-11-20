module.exports = {
  name: 'error-handler',
  async execute(error, client) {
    console.error('❌ Discord client error:', error);
  },
};
