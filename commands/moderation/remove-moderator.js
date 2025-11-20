const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderator = require('../../schemas/Moderator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-moderator')
    .setDescription('Remove a user from server moderators')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The moderator to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');

    // Check if user has permission (must be administrator)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ You must be an administrator to remove moderators!', 
        flags: [4096] 
      });
    }

    try {
      // Check if user is a moderator
      const existingMod = await Moderator.findOne({
        guildId: interaction.guild.id,
        userId: target.id,
      });

      if (!existingMod) {
        return interaction.reply({ 
          content: `❌ **${target.tag}** is not a moderator in the database!`, 
          flags: [4096] 
        });
      }

      // Remove moderator from database
      await Moderator.deleteOne({
        guildId: interaction.guild.id,
        userId: target.id,
      });

      await interaction.reply({
        content: `✅ Successfully removed **${target.tag}** from moderators!\n*Note: If they are an administrator, they will still have moderator permissions.*`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error removing moderator:', error);
      await interaction.reply({ 
        content: '❌ Failed to remove moderator. Please try again.', 
        flags: [4096] 
      });
    }
  },
};
