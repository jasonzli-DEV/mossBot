# MossBot 🤖

A feature-rich Discord bot built with Discord.js v14, featuring moderation tools, activity tracking, music playback, and more!

## Features

### 🛡️ Moderation System
- **Ban/Kick Members** - Full moderation with role hierarchy checks
- **Role Management** - Add and remove roles from members
- **Moderator System** - Assign custom moderators (Admins are always moderators)
- **List Moderators** - View all moderators and administrators
- **Permission Validation** - Automatic checks for permissions and role hierarchy

### 📊 Advanced Activity Tracking
- **Online/Offline Tracking** - Users can mark themselves as online/offline
- **Live Activity Dashboard** - A single persistent message showing:
  - Real-time online/offline status for each member
  - Time tracked for today, this week, and this month
  - Automatic dashboard updates every 5 minutes
- **Persistent Storage** - All activity data stored in MongoDB
- **Automatic Time Resets** - Daily, weekly, and monthly statistics reset automatically

### 🎵 Automated Music System
- **Auto-Join & Loop** - Bot automatically joins configured voice channel on startup
- **Continuous Playback** - Music loops indefinitely, never stops
- **Auto-Recovery** - Reconnects and restarts if disconnected
- **Moderator Controls** - Start, stop, or check status with `/music` command
- Uses the `music/music.opus` file

### 📦 Database Integration
- MongoDB integration for data persistence
- User activity tracking with time periods
- Moderator management system
- Moderation action logging
- Ticket system support (ready for implementation)

## Setup

### Prerequisites
- Node.js 16.9.0 or higher
- MongoDB database (optional, but recommended)
- Discord Bot Token

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd MossBot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Edit the `.env` file in the root directory with your values:

```env
BotToken=your_bot_token_here
DatabaseURL=your_mongodb_connection_string
ActivityTrackerChannelID=channel_id_for_activity_dashboard
WelcomeChannelID=channel_id_for_welcome_messages
MusicChannelID=channel_id_for_music_autoplay
ticketChannelID=channel_id_for_tickets
minecraftServerIP=play.invadedlands.net
minecraftServerStatusChannelID=channel_id_for_mc_status
```

**Notes:** 
- The activity dashboard message ID is now stored in the database automatically
- If the dashboard message is deleted, the bot will recreate it automatically
- Bot status is now set via the `/status` command by moderators
- Music will auto-start in the configured `MusicChannelID` on bot launch

4. Start the bot:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Bot Permissions

The bot requires the following permissions:
- Manage Roles
- Kick Members
- Ban Members
- Send Messages
- Embed Links
- Read Message History
- View Channels

## Special Features

### Activity Dashboard
1. Set `ActivityTrackerChannelID` in `.env` to your desired channel
2. Start the bot - it creates the dashboard message automatically
3. Message ID is stored in the database (no manual configuration needed!)
4. If deleted, the bot automatically recreates it

The dashboard updates every 5 minutes and when users use `/online` or `/offline`.

### Auto-Music System
1. Set `MusicChannelID` in `.env` to your voice channel
2. Place your audio file at `music/music.opus`
3. Bot automatically joins and starts looping music on startup
4. Use `/music` command to start/stop manually

### Bot Status Management
- Use `/status <type> <text>` to set bot activity
- Choose from: Playing, Listening, Watching, Competing, Streaming
- Only moderators and admins can change the status

## Project Structure

```
MossBot/
├── commands/
│   ├── activity/             # Activity tracking commands
│   │   ├── online.js
│   │   └── offline.js
│   └── moderation/           # Moderation & utility commands
│       ├── ban.js
│       ├── kick.js
│       ├── role-add.js
│       ├── role-remove.js
│       ├── add-moderator.js
│       ├── remove-moderator.js
│       ├── list-moderators.js
│       ├── play-music.js        # Now: /music command
│       ├── status.js             # New: Set bot status
│       ├── help.js
│       └── serverinfo.js
├── events/                   # Discord event handlers
│   ├── ready.js
│   ├── error.js
│   └── guildMemberAdd.js
├── schemas/                  # MongoDB schemas
│   ├── UserActivity.js
│   ├── Moderator.js
│   ├── ModerationLog.js
│   ├── BotConfig.js          # New: Stores dashboard message ID
│   └── Ticket.js
├── utils/                    # Utility functions
│   ├── activityTracker.js
│   ├── musicPlayer.js        # New: Auto-loop music system
│   └── permissions.js
├── music/                    # Music files
│   └── music.opus
├── index.js                  # Main bot file
├── package.json              # Dependencies
├── .env                      # Environment variables (not tracked)
└── README.md                 # Documentation
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file
5. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
   - Presence Intent
6. Go to OAuth2 > URL Generator
7. Select scopes: `bot` and `applications.commands`
8. Select the required permissions
9. Use the generated URL to invite the bot to your server

## Commands

All commands use Discord's slash command system (`/command`).

### Moderation Commands
- `/ban <user> [reason] [delete-days]` - Ban a member from the server
- `/kick <user> [reason]` - Kick a member from the server
- `/role-add <user> <role>` - Add a role to a member
- `/role-remove <user> <role>` - Remove a role from a member
- `/add-moderator <user>` - Add a user as a moderator (Admin only)
- `/remove-moderator <user>` - Remove a moderator (Admin only)
- `/list-moderators` - List all moderators and administrators

### Activity Commands
- `/online` - Mark yourself as online (updates dashboard)
- `/offline` - Mark yourself as offline (updates dashboard)

### Music Commands
- `/music <start|stop|status>` - Control music playback (Moderators only)

### Bot Configuration Commands
- `/status <type> <text> [url]` - Set bot status with activity type (Moderators only)

### Information Commands
- `/help` - Display all available commands
- `/serverinfo` - Show detailed server statistics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For support, please open an issue on GitHub or contact the maintainer.
