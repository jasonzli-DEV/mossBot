const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        content: '❌ You do not have permission to kick members!', 
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

    // Check role hierarchy
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot kick this member due to role hierarchy!', 
        ephemeral: true 
      });
    }

    if (!member.kickable) {
      return interaction.reply({ 
        content: '❌ I cannot kick this member! They may have higher roles than me.', 
        ephemeral: true 
      });
    }

    try {
      // Kick the member
      await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);

      await interaction.reply({
        content: `✅ Successfully kicked **${target.tag}**\n**Reason:** ${reason}`,
        ephemeral: false
      });

    } catch (error) {
      console.error('Error kicking member:', error);
      await interaction.reply({ 
        content: '❌ Failed to kick the member. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
