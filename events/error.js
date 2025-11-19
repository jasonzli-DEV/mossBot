module.exports = {
  name: 'error',
  async execute(error, client) {
    console.error('❌ Discord client error:', error);
  },
};
