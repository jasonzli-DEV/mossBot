const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete-days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete-days') || 0;

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        content: '❌ You do not have permission to ban members!', 
        ephemeral: true 
      });
    }

    // Fetch member
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member) {
      // Check role hierarchy
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ 
          content: '❌ You cannot ban this member due to role hierarchy!', 
          ephemeral: true 
        });
      }

      if (!member.bannable) {
        return interaction.reply({ 
          content: '❌ I cannot ban this member! They may have higher roles than me.', 
          ephemeral: true 
        });
      }
    }

    try {
      // Ban the user
      await interaction.guild.members.ban(target.id, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason: `${reason} | Banned by ${interaction.user.tag}`
      });

      await interaction.reply({
        content: `✅ Successfully banned **${target.tag}**\n**Reason:** ${reason}`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error banning member:', error);
      await interaction.reply({ 
        content: '❌ Failed to ban the member. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
