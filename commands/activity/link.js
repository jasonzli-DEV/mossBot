const { SlashCommandBuilder } = require('discord.js');
const LinkedAccount = require('../../schemas/LinkedAccount');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Minecraft username')
    .addStringOption(option =>
      option
        .setName('minecraft_username')
        .setDescription('Your exact Minecraft username (case-insensitive)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const minecraftUsername = interaction.options.getString('minecraft_username').trim();
    const minecraftUsernameLower = minecraftUsername.toLowerCase();

    // Validate username (Minecraft usernames are 3-16 chars, alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(minecraftUsername)) {
      return interaction.reply({
        content: '❌ Invalid Minecraft username! Usernames must be 3-16 characters and can only contain letters, numbers, and underscores.',
        flags: [4096],
      });
    }

    try {
      // Check if this Discord user already has a linked account
      const existingUserLink = await LinkedAccount.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      }).maxTimeMS(5000);

      if (existingUserLink) {
        return interaction.reply({
          content: `❌ You already have a linked Minecraft account: **${existingUserLink.minecraftUsername}**\nUse \`/unlink\` first to remove it, then link a new account.`,
          flags: [4096],
        });
      }

      // Check if this Minecraft username is already linked to someone else
      const existingMinecraftLink = await LinkedAccount.findOne({
        guildId: interaction.guild.id,
        minecraftUsernameLower: minecraftUsernameLower,
      }).maxTimeMS(5000);

      if (existingMinecraftLink) {
        return interaction.reply({
          content: `❌ The Minecraft account **${minecraftUsername}** is already linked to another Discord user.`,
          flags: [4096],
        });
      }

      // Create new linked account
      await LinkedAccount.create({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        minecraftUsername: minecraftUsername,
        minecraftUsernameLower: minecraftUsernameLower,
      });

      return interaction.reply({
        content: `✅ Successfully linked your Discord account to Minecraft username: **${minecraftUsername}**\n\nYou will now appear in the activity tracker when you're online in Minecraft!`,
        flags: [4096],
      });

    } catch (error) {
      console.error('Error linking account:', error);
      return interaction.reply({
        content: '❌ An error occurred while linking your account. Please try again later.',
        flags: [4096],
      });
    }
  },
};
