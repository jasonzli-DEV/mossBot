const { EmbedBuilder } = require('discord.js');
const { status } = require('minecraft-server-util');
const BotConfig = require('../schemas/BotConfig');
const Ticket = require('../schemas/Ticket');

// Check Minecraft server status
async function checkMinecraftServerStatus() {
  const serverIP = process.env.minecraftServerIP;
  
  if (!serverIP) {
    return {
      online: false,
      error: 'No server IP configured',
    };
  }

  try {
    // Split IP and port if provided (e.g., "server.com:25565")
    const [host, portStr] = serverIP.includes(':') 
      ? serverIP.split(':') 
      : [serverIP, '25565'];
    const port = parseInt(portStr);

    const response = await status(host, port, { timeout: 5000 });
    
    return {
      online: true,
      host,
      port,
      players: {
        online: response.players.online,
        max: response.players.max,
      },
      version: response.version.name,
      motd: response.motd.clean || 'No MOTD',
    };
  } catch (error) {
    console.error('Error checking Minecraft server status:', error.message);
    return {
      online: false,
      error: error.message,
    };
  }
}

// Get ticket statistics
async function getTicketStats(guildId) {
  try {
    const openTickets = await Ticket.countDocuments({ 
      guildId, 
      status: 'open' 
    }).maxTimeMS(5000);
    
    const totalTickets = await Ticket.countDocuments({ 
      guildId 
    }).maxTimeMS(5000);
    
    return {
      open: openTickets,
      total: totalTickets,
    };
  } catch (error) {
    console.error('Error getting ticket stats:', error.message);
    return {
      open: 0,
      total: 0,
      error: true,
    };
  }
}

// Update server status dashboard
async function updateServerStatusDashboard(client) {
  const channelId = process.env.minecraftServerStatusChannelID;

  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    let config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
    
    if (!config) {
      config = await BotConfig.create({
        guildId: guild.id,
        serverStatusChannelId: channelId,
      });
    }

    // Check Minecraft server
    const mcStatus = await checkMinecraftServerStatus();

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(mcStatus.online ? 0x00FF00 : 0xFF0000)
      .setTitle('🎮 Minecraft Server Status')
      .setDescription('Real-time Minecraft server information')
      .setTimestamp()
      .setFooter({ text: 'Last updated' });

    // Minecraft server status
    if (mcStatus.online) {
      embed.addFields({
        name: 'Server Information',
        value: `**Status:** 🟢 Online\n` +
               `**Address:** \`${mcStatus.host}:${mcStatus.port}\`\n` +
               `**Players:** ${mcStatus.players.online}/${mcStatus.players.max}\n` +
               `**Version:** ${mcStatus.version}\n` +
               `**MOTD:** ${mcStatus.motd.substring(0, 100)}`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Server Information',
        value: `**Status:** 🔴 Offline\n` +
               `**Address:** \`${process.env.minecraftServerIP || 'Not configured'}\`\n` +
               `**Error:** ${mcStatus.error || 'Unknown'}`,
        inline: false,
      });
    }

    // Try to edit existing message, or create new one
    if (config.serverStatusMessageId) {
      console.log(`🔍 Checking for existing server status message: ${config.serverStatusMessageId}`);
      const message = await channel.messages.fetch(config.serverStatusMessageId).catch(() => null);
      
      if (message) {
        await message.edit({ embeds: [embed] });
        return;
      } else {
        console.log('🖥️ Server status message was deleted, creating a new one...');
      }
    } else {
      console.log('🖥️ No existing server status message found, creating new one...');
    }

    // Create new message
    const newMessage = await channel.send({ embeds: [embed] });
    
    config.serverStatusMessageId = newMessage.id;
    config.serverStatusChannelId = channelId;
    await config.save();
    
    console.log(`🖥️ Server status dashboard created with message ID: ${newMessage.id}`);

  } catch (error) {
    console.error('Error updating server status dashboard:', error);
  }
}

module.exports = {
  updateServerStatusDashboard,
  checkMinecraftServerStatus,
  getTicketStats,
};
