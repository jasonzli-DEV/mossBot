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

    const SUPER_USER_ID = '1288337361490411542';

    // Check if target is super user
    if (target.id === SUPER_USER_ID) {
      return interaction.reply({ 
        content: '❌ You cannot kick the super user!', 
        flags: [4096] 
      });
    }

    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        content: '❌ You do not have permission to kick members!', 
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

    // Check role hierarchy
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ You cannot kick this member due to role hierarchy!', 
        flags: [4096] 
      });
    }

    if (!member.kickable) {
      return interaction.reply({ 
        content: '❌ I cannot kick this member! They may have higher roles than me.', 
        flags: [4096] 
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
        flags: [4096] 
      });
    }
  },
};
