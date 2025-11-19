const { SlashCommandBuilder } = require('discord.js');
const { updateUserActivity, updateActivityDashboard } = require('../../utils/activityTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('offline')
    .setDescription('Mark yourself as offline/away'),

  async execute(interaction, client) {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    try {
      // Update user activity
      await updateUserActivity(guildId, user.id, user.tag, false);

      // Update the dashboard
      await updateActivityDashboard(client);

      await interaction.reply({
        content: '✅ You have been marked as **OFFLINE**! The activity dashboard has been updated.',
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
