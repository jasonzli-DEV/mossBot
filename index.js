require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { updateActivityDashboard } = require('./utils/activityTracker');
const { initializeMusic } = require('./music/music');

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
  const commandFolders = fs.readdirSync(commandsPath);

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
      await mongoose.connect(process.env.DatabaseURL);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
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
  
  // Register commands
  const commands = loadCommands();
  await registerCommands(commands);
  
  // Initialize activity dashboard
  if (process.env.ActivityTrackerChannelID) {
    await updateActivityDashboard(client);
    console.log('📊 Activity dashboard initialized');
    
    // Update dashboard every 5 minutes
    setInterval(async () => {
      await updateActivityDashboard(client);
    }, 5 * 60 * 1000);
  }
  
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
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    const errorMessage = { content: '❌ There was an error executing this command!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Initialize bot
async function start() {
  await connectDatabase();
  loadEvents();
  await client.login(process.env.BotToken);
}

start();
