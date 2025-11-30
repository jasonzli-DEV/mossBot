require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { updateActivityDashboard } = require('./utils/activityTracker');
const { updateServerStatusDashboard } = require('./utils/serverStatusTracker');
const { updateTicketPanel } = require('./utils/ticketSystem');
const { initializeMusic } = require('./music/music');
const { initializePlayerListTracker } = require('./utils/playerListTracker');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

// Create command collection
client.commands = new Collection();

// Load commands
function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(commandsPath).filter(file => {
    return fs.statSync(path.join(commandsPath, file)).isDirectory();
  });

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`⚠️  Skipped ${file}: missing data or execute function`);
      }
    }
  }
  
  return commands;
}

// Load events
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  
  if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath);
  }
  
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    
    console.log(`✅ Loaded event: ${event.name}`);
  }
}

// Connect to MongoDB
async function connectDatabase() {
  if (process.env.DatabaseURL) {
    try {
      await mongoose.connect(process.env.DatabaseURL, {
        serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
        socketTimeoutMS: 45000, // Socket timeout
        connectTimeoutMS: 30000, // Connection timeout
        maxPoolSize: 10, // Connection pool size
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      });
      console.log('✅ Connected to MongoDB');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected. Attempting to reconnect...');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      console.log('⚠️  Bot will continue running with limited functionality');
    }
  } else {
    console.log('⚠️  No database URL provided, skipping database connection');
  }
}

// Register slash commands
async function registerCommands(commands) {
  const rest = new REST({ version: '10' }).setToken(process.env.BotToken);

  try {
    console.log('🔄 Refreshing application (/) commands...');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('✅ Successfully registered application commands');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} is online!`);
  
  // Load bot status from database
  const BotConfig = require('./schemas/BotConfig');
  const { ActivityType } = require('discord.js');
  
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      const config = await BotConfig.findOne({ guildId: guild.id }).maxTimeMS(5000);
      
      if (config && config.botStatus && config.botStatus.text) {
        const activityTypeMap = {
          playing: ActivityType.Playing,
          listening: ActivityType.Listening,
          watching: ActivityType.Watching,
          competing: ActivityType.Competing,
          streaming: ActivityType.Streaming,
        };
        
        const activityType = activityTypeMap[config.botStatus.type];
        
        if (config.botStatus.type === 'streaming' && config.botStatus.url) {
          client.user.setActivity(config.botStatus.text, { 
            type: activityType,
            url: config.botStatus.url 
          });
        } else {
          client.user.setActivity(config.botStatus.text, { type: activityType });
        }
        
        console.log(`✅ Loaded bot status from database: ${config.botStatus.type} ${config.botStatus.text}`);
      }
    }
  } catch (error) {
    console.error('Error loading bot status:', error);
  }
  
  // Register commands
  const commands = loadCommands();
  await registerCommands(commands);
  
  // Initialize activity dashboard
  if (process.env.ActivityTrackerChannelID) {
    await updateActivityDashboard(client);
    console.log('📊 Activity dashboard initialized');
    
    // Update dashboard every 30 seconds
    setInterval(async () => {
      await updateActivityDashboard(client);
    }, 30000);
  }
  
  // Initialize server status dashboard
  if (process.env.minecraftServerStatusChannelID) {
    await updateServerStatusDashboard(client);
    console.log('🖥️ Server status dashboard initialized');
    
    // Update dashboard every minute
    setInterval(async () => {
      await updateServerStatusDashboard(client);
    }, 60 * 1000);
  }
  
  // Initialize ticket panel
  if (process.env.ticketChannelID) {
    await updateTicketPanel(client);
    console.log('🎫 Ticket panel initialized');
  }

  // Initialize activity schedulers
  const { scheduleMidnightReset, scheduleInactivityCheck, scheduleOnlineActivityIncrement } = require('./utils/activityScheduler');
  scheduleMidnightReset(client);
  scheduleInactivityCheck(client);
  scheduleOnlineActivityIncrement(client);

  // Initialize player list tracker
  initializePlayerListTracker(client);
  
  // Auto-start music if MusicChannelID is configured
  if (process.env.MusicChannelID) {
    // Wait a bit for the bot to fully initialize
    setTimeout(() => {
      initializeMusic(client);
    }, 3000);
  }
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    const { createTicket, closeTicket } = require('./utils/ticketSystem');
    const customId = interaction.customId;

    try {
      // Handle create ticket button
      if (customId === 'create_ticket') {
        await createTicket(interaction);
        return;
      }

      // Handle close ticket button
      if (customId.startsWith('close_ticket_')) {
        const ticketId = customId.replace('close_ticket_', '');
        await closeTicket(interaction, ticketId);
        return;
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
    }
    
    return;
  }
  
  // Handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    // Check if command must be used in specific channel
    const BotConfig = require('./schemas/BotConfig');
    const { isModerator } = require('./utils/permissions');
    
    const config = await BotConfig.findOne({ guildId: interaction.guild.id }).maxTimeMS(5000);
    
    if (config && config.commandsChannelId && interaction.channelId !== config.commandsChannelId) {
      // Check if user is moderator (they bypass the restriction)
      const userIsMod = await isModerator(interaction.member);
      
      if (!userIsMod) {
        const commandsChannel = interaction.guild.channels.cache.get(config.commandsChannelId);
        return interaction.reply({
          content: `❌ Please use bot commands in ${commandsChannel || 'the designated commands channel'}!`,
          flags: [4096]
        });
      }
    }

    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    try {
      const errorMessage = { content: '❌ There was an error executing this command!', flags: [4096] };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (replyError) {
      // Ignore errors when trying to reply (interaction may have expired)
      console.error('Could not send error message to user:', replyError.message);
    }
  }
});

// Initialize bot
async function start() {
  console.log('🔄 Starting bot...');
  console.log('🔄 Connecting to database...');
  await connectDatabase();
  console.log('🔄 Loading events...');
  loadEvents();
  console.log('🔄 Logging in to Discord...');
  await client.login(process.env.BotToken);
  console.log('🔄 Login complete, waiting for ready event...');
}

start();
