const { SlashCommandBuilder } = require('discord.js');
const LinkedAccount = require('../../schemas/LinkedAccount');
const UserActivity = require('../../schemas/UserActivity');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Minecraft account and remove your activity data'),

  async execute(interaction) {
    try {
      // Check if user has a linked account
      const linkedAccount = await LinkedAccount.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      }).maxTimeMS(5000);

      if (!linkedAccount) {
        return interaction.reply({
          content: '❌ You don\'t have a linked Minecraft account.',
          flags: [4096],
        });
      }

      const minecraftUsername = linkedAccount.minecraftUsername;

      // Delete the linked account
      await LinkedAccount.deleteOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      // Delete all activity data for this user
      await UserActivity.deleteOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      return interaction.reply({
        content: `✅ Successfully unlinked your Minecraft account: **${minecraftUsername}**\n\nYour activity data has been removed from the tracker.`,
        flags: [4096],
      });

    } catch (error) {
      console.error('Error unlinking account:', error);
      return interaction.reply({
        content: '❌ An error occurred while unlinking your account. Please try again later.',
        flags: [4096],
      });
    }
  },
};
