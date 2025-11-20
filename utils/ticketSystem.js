const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const BotConfig = require('../schemas/BotConfig');
const Ticket = require('../schemas/Ticket');
const Moderator = require('../schemas/Moderator');

// Create or update ticket panel
async function updateTicketPanel(client) {
  const channelId = process.env.ticketChannelID;

  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error('❌ Ticket channel not found');
    return;
  }

  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
    
    if (!config) {
      config = await BotConfig.create({
        guildId: guild.id,
        ticketPanelChannelId: channelId,
      });
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎫 Support Ticket System')
      .setDescription(
        '**Need help?** Create a support ticket and our staff will assist you!\n\n' +
        '**How it works:**\n' +
        '1️⃣ Click the "Create Ticket" button below\n' +
        '2️⃣ A private channel will be created for you\n' +
        '3️⃣ Describe your issue in the ticket\n' +
        '4️⃣ Staff will respond as soon as possible\n' +
        '5️⃣ Once resolved, use the "Close Ticket" button\n\n' +
        '**Note:** Only create tickets for legitimate support issues.'
      )
      .setTimestamp()
      .setFooter({ text: 'Support Team' });

    // Create button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Create Ticket')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );

    // Try to edit existing message, or create new one
    if (config.ticketPanelMessageId) {
      console.log(`🔍 Checking for existing ticket panel message: ${config.ticketPanelMessageId}`);
      const message = await channel.messages.fetch(config.ticketPanelMessageId).catch(() => null);
      
      if (message) {
        await message.edit({ embeds: [embed], components: [row] });
        console.log('✅ Ticket panel updated');
        return;
      } else {
        console.log('🎫 Ticket panel message was deleted, creating a new one...');
      }
    } else {
      console.log('🎫 No existing ticket panel message found, creating new one...');
    }

    // Create new message
    const newMessage = await channel.send({ embeds: [embed], components: [row] });
    
    config.ticketPanelMessageId = newMessage.id;
    config.ticketPanelChannelId = channelId;
    await config.save();
    
    console.log(`🎫 Ticket panel created with message ID: ${newMessage.id}`);

  } catch (error) {
    console.error('Error updating ticket panel:', error);
  }
}

// Create a new ticket
async function createTicket(interaction) {
  try {
    const guild = interaction.guild;
    const user = interaction.user;

    // Check if user already has an open ticket BEFORE deferring
    const existingTicket = await Ticket.findOne({
      guildId: guild.id,
      userId: user.id,
      status: 'open',
    }).maxTimeMS(5000);

    if (existingTicket) {
      await interaction.reply({
        content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`,
        ephemeral: true
      });
      return;
    }

    // Now defer the reply for ticket creation
    await interaction.deferReply({ ephemeral: true });

    // Get or create config
    let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
    
    if (!config) {
      config = await BotConfig.create({
        guildId: guild.id,
        ticketCounter: 0,
      });
    }

    // Increment ticket counter
    config.ticketCounter += 1;
    const ticketNumber = config.ticketCounter;
    await config.save();

    const ticketId = `ticket-${ticketNumber}`;
    const channelName = `ticket-${ticketNumber}`;

    // Get or create ticket category
    let category = null;
    if (config.ticketCategoryId) {
      category = guild.channels.cache.get(config.ticketCategoryId);
    }
    
    if (!category) {
      // Try to find existing "Tickets" category
      category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets'
      );
      
      if (!category) {
        // Create new category
        category = await guild.channels.create({
          name: 'Tickets',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });
      }
      
      config.ticketCategoryId = category.id;
      await config.save();
    }

    // Get all moderators from database
    const moderators = await Moderator.find({ guildId: guild.id }).maxTimeMS(5000);
    const moderatorIds = moderators.map(mod => mod.userId);

    // Get all administrators (they are always moderators)
    const adminMembers = guild.members.cache.filter(member => 
      member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot
    );
    const adminIds = Array.from(adminMembers.keys());

    // Combine moderator and admin IDs (remove duplicates)
    const allModeratorIds = [...new Set([...moderatorIds, ...adminIds])];

    // Build permission overwrites array
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    // Add permissions for all moderators and admins
    for (const modId of allModeratorIds) {
      permissionOverwrites.push({
        id: modId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites,
    });

    // Save ticket to database
    const ticket = await Ticket.create({
      ticketId,
      userId: user.id,
      username: user.tag,
      channelId: ticketChannel.id,
      guildId: guild.id,
      status: 'open',
      subject: 'Support Request',
    });

    // Create welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 Ticket #${ticketNumber}`)
      .setDescription(
        `${user}, thank you for creating a support ticket!\n\n` +
        '**A staff member will be with you shortly.**\n\n' +
        'Please describe your issue in detail so we can assist you better.\n' +
        'When your issue is resolved, click the "Close Ticket" button below.'
      )
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${ticketId}` });

    // Create close button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket_${ticketId}`)
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

    // Build moderator ping message (exclude the ticket creator)
    const moderatorMentions = allModeratorIds
      .filter(id => id !== user.id)
      .map(id => `<@${id}>`)
      .join(' ');
    const contentMessage = moderatorMentions 
      ? `${user} ${moderatorMentions}` 
      : `${user}`;

    // Send welcome message with moderator pings
    await ticketChannel.send({
      content: contentMessage,
      embeds: [welcomeEmbed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ Ticket created: ${ticketChannel}`
    });

    console.log(`🎫 Ticket #${ticketNumber} created by ${user.tag}`);

  } catch (error) {
    console.error('Error creating ticket:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Failed to create ticket. Please try again later.'
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to create ticket. Please try again later.',
          flags: [4096]
        });
      }
    } catch (replyError) {
      console.error('Could not send error message:', replyError.message);
    }
  }
}

// Close a ticket
async function closeTicket(interaction, ticketId) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    // Find ticket in database
    const ticket = await Ticket.findOne({
      ticketId,
      guildId: guild.id,
    }).maxTimeMS(5000);

    if (!ticket) {
      return await interaction.editReply({
        content: '❌ Ticket not found in database.'
      });
    }

    if (ticket.status === 'closed') {
      return await interaction.editReply({
        content: '❌ This ticket is already closed.'
      });
    }

    // Update ticket in database
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = user.id;
    await ticket.save();

    // Send closing message
    const closeEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔒 Ticket Closed')
      .setDescription(
        `This ticket has been closed by ${user}.\n\n` +
        'The channel will be deleted in 10 seconds.'
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [closeEmbed] });

    // Delete channel after 10 seconds
    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
        console.log(`🎫 Ticket ${ticketId} closed and channel deleted by ${user.tag}`);
      } catch (error) {
        console.error('Error deleting ticket channel:', error);
      }
    }, 10000);

  } catch (error) {
    console.error('Error closing ticket:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Failed to close ticket. Please try again later.'
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to close ticket. Please try again later.',
          flags: [4096]
        });
      }
    } catch (replyError) {
      console.error('Could not send error message:', replyError.message);
    }
  }
}

module.exports = {
  updateTicketPanel,
  createTicket,
  closeTicket,
};
