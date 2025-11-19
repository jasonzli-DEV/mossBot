const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('Remove a role from a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to remove the role from')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');
    const role = interaction.options.getRole('role');

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ 
        content: '❌ You do not have permission to manage roles!', 
        ephemeral: true 
      });
    }

    // Fetch member
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ 
        content: '❌ This user is not in the server!', 
        ephemeral: true 
      });
    }

    // Check if member has the role
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ 
        content: `❌ **${target.tag}** does not have the role **${role.name}**!`, 
        ephemeral: true 
      });
    }

    // Check role hierarchy
    if (role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot manage this role due to role hierarchy!', 
        ephemeral: true 
      });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ I cannot manage this role! It is higher than my highest role.', 
        ephemeral: true 
      });
    }

    try {
      // Remove the role
      await member.roles.remove(role);

      await interaction.reply({
        content: `✅ Successfully removed **${role.name}** from **${target.tag}**`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error removing role:', error);
      await interaction.reply({ 
        content: '❌ Failed to remove the role. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
