const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const ModerationLog = require('../../schemas/ModerationLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member (Moderators only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to unmute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the unmute')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Check if user is a moderator
    const userIsMod = await isModerator(interaction.member);
    
    if (!userIsMod) {
      return interaction.reply({ 
        content: '❌ You must be a moderator or administrator to use this command!', 
        flags: [4096]
      });
    }

    // Check if bot has permissions
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ 
        content: '❌ I need the "Timeout Members" permission to unmute members!', 
        flags: [4096]
      });
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      // Check if member is actually muted
      if (!member.communicationDisabledUntil) {
        return interaction.reply({ 
          content: '❌ This user is not muted!', 
          flags: [4096]
        });
      }

      // Remove timeout
      await member.timeout(null, reason);

      // Log the unmute
      await ModerationLog.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        username: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        action: 'unmute',
        reason: reason,
      });

      // Send DM to user
      try {
        await targetUser.send(
          `✅ You have been unmuted in **${interaction.guild.name}**\n` +
          `**Reason:** ${reason}`
        );
      } catch (error) {
        // User has DMs disabled
      }

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been unmuted\n**Reason:** ${reason}`,
        flags: [4096]
      });

    } catch (error) {
      console.error('Error unmuting member:', error);
      await interaction.reply({ 
        content: '❌ Failed to unmute member. Please try again.', 
        flags: [4096]
      });
    }
  },
};
