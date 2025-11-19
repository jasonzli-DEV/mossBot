const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Moderator = require('../../schemas/Moderator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-moderator')
    .setDescription('Add a user as a server moderator')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to make a moderator')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');

    // Check if user has permission (must be administrator)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ You must be an administrator to add moderators!', 
        ephemeral: true 
      });
    }

    // Check if target is a bot
    if (target.bot) {
      return interaction.reply({ 
        content: '❌ You cannot make a bot a moderator!', 
        ephemeral: true 
      });
    }

    // Fetch member to ensure they're in the server
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ 
        content: '❌ This user is not in the server!', 
        ephemeral: true 
      });
    }

    try {
      // Check if user is already a moderator
      const existingMod = await Moderator.findOne({
        guildId: interaction.guild.id,
        userId: target.id,
      });

      if (existingMod) {
        return interaction.reply({ 
          content: `❌ **${target.tag}** is already a moderator!`, 
          ephemeral: true 
        });
      }

      // Add moderator to database
      await Moderator.create({
        guildId: interaction.guild.id,
        userId: target.id,
        username: target.tag,
        addedBy: interaction.user.id,
      });

      await interaction.reply({
        content: `✅ Successfully added **${target.tag}** as a moderator!\n*Note: Administrators are always moderators by default.*`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error adding moderator:', error);
      await interaction.reply({ 
        content: '❌ Failed to add moderator. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
