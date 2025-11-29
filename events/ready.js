module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Serving ${client.users.cache.size} user(s)`);
  },
};
