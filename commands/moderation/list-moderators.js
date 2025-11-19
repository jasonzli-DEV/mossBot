const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getModerators } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-moderators')
    .setDescription('List all server moderators'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const guild = interaction.guild;
      const moderators = await getModerators(guild.id);

      // Get administrators
      const administrators = guild.members.cache.filter(member => 
        member.permissions.has(PermissionFlagsBits.Administrator)
      );

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ Server Moderators')
        .setDescription('List of all moderators and administrators')
        .setTimestamp()
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });

      // Add administrators
      if (administrators.size > 0) {
        const adminList = administrators.map(member => 
          `• <@${member.id}> (${member.user.tag})`
        ).join('\n');
        
        embed.addFields({
          name: '👑 Administrators (Always Moderators)',
          value: adminList,
          inline: false,
        });
      }

      // Add moderators from database
      if (moderators.length > 0) {
        const modList = [];
        
        for (const mod of moderators) {
          // Skip if already an administrator
          if (administrators.has(mod.userId)) continue;
          
          const member = await guild.members.fetch(mod.userId).catch(() => null);
          if (member) {
            modList.push(`• <@${mod.userId}> (${mod.username})`);
          } else {
            modList.push(`• ${mod.username} *(Not in server)*`);
          }
        }

        if (modList.length > 0) {
          embed.addFields({
            name: '🛡️ Assigned Moderators',
            value: modList.join('\n'),
            inline: false,
          });
        }
      }

      if (administrators.size === 0 && moderators.length === 0) {
        embed.setDescription('No moderators found in this server.');
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing moderators:', error);
      await interaction.editReply({ 
        content: '❌ Failed to list moderators. Please try again.' 
      });
    }
  },
};
