const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once (Moderators only)')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user')
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
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ 
        content: '❌ I need the "Manage Messages" permission to purge messages!', 
        flags: [4096]
      });
    }

    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    try {
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      
      let messagesToDelete = Array.from(messages.values());

      // Filter by user if specified
      if (targetUser) {
        messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
      }

      // Take only the requested amount
      messagesToDelete = messagesToDelete.slice(0, amount);

      // Filter out messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messagesToDelete.length - recentMessages.length;

      if (recentMessages.length === 0) {
        return interaction.reply({ 
          content: '❌ No messages found to delete (messages must be less than 14 days old).',
          flags: [4096]
        });
      }

      // Bulk delete messages
      await interaction.channel.bulkDelete(recentMessages, true);

      let response = `✅ Successfully deleted **${recentMessages.length}** message(s)`;
      
      if (targetUser) {
        response += ` from **${targetUser.tag}**`;
      }
      
      if (oldMessages > 0) {
        response += `\n⚠️ ${oldMessages} message(s) were too old to delete (14+ days)`;
      }

      const reply = await interaction.reply({ 
        content: response,
        flags: [4096],
        fetchReply: true
      });

      // Auto-delete the response after 5 seconds
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (error) {
          // Ignore if already deleted
        }
      }, 5000);

    } catch (error) {
      console.error('Error purging messages:', error);
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: '❌ Failed to purge messages. Please try again.',
            flags: [4096]
          });
        } else {
          await interaction.reply({ 
            content: '❌ Failed to purge messages. Please try again.',
            flags: [4096]
          });
        }
      } catch (replyError) {
        // Ignore if can't send error message
        console.error('Could not send error message:', replyError.message);
      }
    }
  },
};
