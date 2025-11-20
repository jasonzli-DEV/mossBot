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
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    const SUPER_USER_ID = '1288337361490411542';

    // Check if target is super user
    if (targetUser.id === SUPER_USER_ID) {
      return interaction.reply({ 
        content: '❌ You cannot modify roles of the super user!', 
        flags: [4096] 
      });
    }

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ 
        content: '❌ You do not have permission to manage roles!', 
        flags: [4096] 
      });
    }

    // Fetch member
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ 
        content: '❌ This user is not in the server!', 
        flags: [4096] 
      });
    }

    // Check if member has the role
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ 
        content: `❌ **${target.tag}** does not have the role **${role.name}**!`, 
        flags: [4096] 
      });
    }

    // Check role hierarchy
    if (role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot manage this role due to role hierarchy!', 
        flags: [4096] 
      });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ I cannot manage this role! It is higher than my highest role.', 
        flags: [4096] 
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
        flags: [4096] 
      });
    }
  },
};
