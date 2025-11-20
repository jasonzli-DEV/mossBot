const { SlashCommandBuilder, PermissionFlagBits } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const ModerationLog = require('../../schemas/ModerationLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member (Moderators only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to mute')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes (1-40320 = 28 days max)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the mute')
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
    if (!interaction.guild.members.me.permissions.has(PermissionFlagBits.ModerateMembers)) {
      return interaction.reply({ 
        content: '❌ I need the "Timeout Members" permission to mute members!', 
        flags: [4096]
      });
    }

    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      // Check if target is moderator
      const targetIsMod = await isModerator(member);
      if (targetIsMod) {
        return interaction.reply({ 
          content: '❌ You cannot mute a moderator or administrator!', 
          flags: [4096]
        });
      }

      // Check role hierarchy
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ 
          content: '❌ You cannot mute someone with a higher or equal role!', 
          flags: [4096]
        });
      }

      if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ 
          content: '❌ I cannot mute someone with a higher or equal role than me!', 
          flags: [4096]
        });
      }

      // Convert duration to milliseconds
      const durationMs = duration * 60 * 1000;
      const until = new Date(Date.now() + durationMs);

      // Timeout the member
      await member.timeout(durationMs, reason);

      // Format duration for display
      let durationText = '';
      if (duration >= 1440) {
        const days = Math.floor(duration / 1440);
        const hours = Math.floor((duration % 1440) / 60);
        durationText = `${days}d ${hours}h`;
      } else if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        durationText = `${hours}h ${mins}m`;
      } else {
        durationText = `${duration}m`;
      }

      // Log the mute
      await ModerationLog.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        username: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        action: 'mute',
        reason: reason,
        duration: duration,
      });

      // Send DM to user
      try {
        await targetUser.send(
          `⏰ You have been muted in **${interaction.guild.name}**\n` +
          `**Duration:** ${durationText}\n` +
          `**Reason:** ${reason}\n` +
          `**Until:** <t:${Math.floor(until.getTime() / 1000)}:F>`
        );
      } catch (error) {
        // User has DMs disabled
      }

      await interaction.reply({
        content: `✅ **${targetUser.tag}** has been muted for **${durationText}**\n**Reason:** ${reason}`,
        flags: [4096]
      });

    } catch (error) {
      console.error('Error muting member:', error);
      await interaction.reply({ 
        content: '❌ Failed to mute member. Please try again.', 
        flags: [4096]
      });
    }
  },
};
