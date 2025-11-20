const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('Add a role to a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to add the role to')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to add')
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

    // Check if member already has the role
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ 
        content: `❌ **${target.tag}** already has the role **${role.name}**!`, 
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
      // Add the role
      await member.roles.add(role);

      await interaction.reply({
        content: `✅ Successfully added **${role.name}** to **${target.tag}**`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error adding role:', error);
      await interaction.reply({ 
        content: '❌ Failed to add the role. Please try again.', 
        flags: [4096] 
      });
    }
  },
};
