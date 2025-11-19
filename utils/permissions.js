const { PermissionFlagsBits } = require('discord.js');
const Moderator = require('../schemas/Moderator');

/**
 * Check if a member is a moderator
 * Administrators are always considered moderators
 * @param {GuildMember} member - The guild member to check
 * @returns {Promise<boolean>}
 */
async function isModerator(member) {
  // Administrators are always moderators
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check database for moderator role
  const moderator = await Moderator.findOne({
    guildId: member.guild.id,
    userId: member.id,
  });

  return !!moderator;
}

/**
 * Get all moderators for a guild
 * @param {string} guildId - The guild ID
 * @returns {Promise<Array>}
 */
async function getModerators(guildId) {
  return await Moderator.find({ guildId });
}

module.exports = {
  isModerator,
  getModerators,
};
