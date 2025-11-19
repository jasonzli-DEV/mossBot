const { SlashCommandBuilder } = require('discord.js');
const { updateUserActivity, updateActivityDashboard } = require('../../utils/activityTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('Mark yourself as online/active'),

  async execute(interaction, client) {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    try {
      // Update user activity
      await updateUserActivity(guildId, user.id, user.tag, true);

      // Update the dashboard
      await updateActivityDashboard(client);

      await interaction.reply({
        content: '✅ You have been marked as **ONLINE**! The activity dashboard has been updated.',
        ephemeral: true
      });

    } catch (error) {
      console.error('Error updating activity:', error);
      await interaction.reply({ 
        content: '❌ Failed to update activity status. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
