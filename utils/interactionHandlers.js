const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UserTimezone = require('../schemas/UserTimezone');
const LinkedAccount = require('../schemas/LinkedAccount');
const BotConfig = require('../schemas/BotConfig');
const {
  TIMEZONE_DATA,
  createRegionButtons,
  createSubregionButtons,
  createTimezoneSelect,
  createRegionEmbed,
  createSubregionEmbed,
  createTimezoneEmbed,
  createSuccessEmbed,
} = require('../commands/moderation/set-timezone');

// Track onboarding state per user (in memory - resets on bot restart)
const onboardingState = new Map();

// Helper function to send logs to moderator channel
async function logToModeratorChannel(guild, message) {
  try {
    const config = await BotConfig.findOne({ guildId: guild.id });
    if (config && config.moderatorChannelId) {
      const modChannel = guild.channels.cache.get(config.moderatorChannelId);
      if (modChannel) {
        await modChannel.send(message);
      }
    }
  } catch (error) {
    console.error('Error logging to moderator channel:', error);
  }
}

// Handle timezone buttons (standalone /set-timezone command)
async function handleTimezoneButton(interaction) {
  const customId = interaction.customId;
  
  // Back to regions
  if (customId === 'tz_back_regions') {
    const embed = createRegionEmbed();
    const buttons = createRegionButtons();
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Region selected
  if (customId.startsWith('tz_region_')) {
    const regionKey = customId.replace('tz_region_', '');
    const embed = createSubregionEmbed(regionKey);
    const buttons = createSubregionButtons(regionKey);
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Back to subregions
  if (customId.startsWith('tz_back_subregions_')) {
    const regionKey = customId.replace('tz_back_subregions_', '');
    const embed = createSubregionEmbed(regionKey);
    const buttons = createSubregionButtons(regionKey);
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Subregion selected
  if (customId.startsWith('tz_subregion_')) {
    const parts = customId.replace('tz_subregion_', '').split('_');
    const regionKey = parts[0];
    const subregionKey = parts.slice(1).join('_');
    const embed = createTimezoneEmbed(regionKey, subregionKey);
    const components = createTimezoneSelect(regionKey, subregionKey);
    await interaction.update({ embeds: [embed], components });
    return;
  }
}

// Handle timezone select menu (standalone /set-timezone command)
async function handleTimezoneSelect(interaction) {
  const timezone = interaction.values[0];
  
  // Save timezone to database
  await UserTimezone.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: interaction.user.id },
    { timezone },
    { upsert: true }
  );
  
  const embed = createSuccessEmbed(timezone);
  await interaction.update({ embeds: [embed], components: [] });
}

// Handle onboarding buttons
async function handleOnboardingButton(interaction, client) {
  const customId = interaction.customId;
  
  // Start onboarding
  if (customId === 'onboarding_start') {
    // Check if user has already completed steps
    const existingTimezone = await UserTimezone.findOne({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
    });
    
    const existingAccount = await LinkedAccount.findOne({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
    });
    
    // If both steps are complete, show completion message
    if (existingTimezone && existingAccount) {
      const now = new Date();
      const timeStr = now.toLocaleString('en-US', {
        timeZone: existingTimezone.timezone,
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Already Onboarded!')
        .setDescription(
          `You've already completed the onboarding process!\n\n` +
          `**Your Setup:**\n` +
          `🕐 Timezone: ${existingTimezone.timezone}\n` +
          `   Local time: ${timeStr}\n` +
          `🎮 Minecraft: ${existingAccount.minecraftUsername}\n\n` +
          `You have full access to the server!`
        );
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }
    
    // Log to moderator channel
    await logToModeratorChannel(
      interaction.guild,
      `📋 **Onboarding Started**\n${interaction.user} (${interaction.user.tag}) has started the onboarding process.`
    );
    
    // If timezone exists, skip to step 2 (Minecraft account)
    if (existingTimezone) {
      onboardingState.set(interaction.user.id, { step: 2, timezone: existingTimezone.timezone, minecraftUsername: null });
      
      const now = new Date();
      const timeStr = now.toLocaleString('en-US', {
        timeZone: existingTimezone.timezone,
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Onboarding - Step 2 of 2')
        .setDescription(
          `✅ **Timezone already set!**\nYour local time: ${timeStr}\n\n` +
          `**Link Your Minecraft Account**\n\nClick the button below to link your Minecraft account.`
        )
        .setFooter({ text: 'Step 1: ✅ Complete • Step 2: Minecraft Account' });
      
      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('onboarding_link_minecraft')
          .setLabel('🎮 Link Minecraft Account')
          .setStyle(ButtonStyle.Primary)
      );
      
      await interaction.reply({
        embeds: [embed],
        components: [button],
        ephemeral: true,
      });
      return;
    }
    
    // Start from step 1 (timezone)
    onboardingState.set(interaction.user.id, { step: 1, timezone: null, minecraftUsername: null });
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Onboarding - Step 1 of 2')
      .setDescription('**Set Your Timezone**\n\nSelect your region from the buttons below to set your timezone.\n\nThis helps other members know your local time!')
      .setFooter({ text: 'Step 1: Timezone • Step 2: Minecraft Account' });
    
    const buttons = createOnboardingRegionButtons();
    
    await interaction.reply({
      embeds: [embed],
      components: buttons,
      ephemeral: true,
    });
    return;
  }
  
  // Back to regions (onboarding)
  if (customId === 'onboarding_back_regions') {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Onboarding - Step 1 of 2')
      .setDescription('**Set Your Timezone**\n\nSelect your region from the buttons below to set your timezone.')
      .setFooter({ text: 'Step 1: Timezone • Step 2: Minecraft Account' });
    
    const buttons = createOnboardingRegionButtons();
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Region selected (onboarding)
  if (customId.startsWith('onboarding_region_')) {
    const regionKey = customId.replace('onboarding_region_', '');
    const region = TIMEZONE_DATA[regionKey];
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📋 Onboarding - Step 1 of 2`)
      .setDescription(`**Set Your Timezone - ${region.name}**\n\nSelect your subregion from the buttons below.`)
      .setFooter({ text: 'Step 1: Timezone • Step 2: Minecraft Account' });
    
    const buttons = createOnboardingSubregionButtons(regionKey);
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Back to subregions (onboarding)
  if (customId.startsWith('onboarding_back_subregions_')) {
    const regionKey = customId.replace('onboarding_back_subregions_', '');
    const region = TIMEZONE_DATA[regionKey];
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📋 Onboarding - Step 1 of 2`)
      .setDescription(`**Set Your Timezone - ${region.name}**\n\nSelect your subregion from the buttons below.`)
      .setFooter({ text: 'Step 1: Timezone • Step 2: Minecraft Account' });
    
    const buttons = createOnboardingSubregionButtons(regionKey);
    await interaction.update({ embeds: [embed], components: buttons });
    return;
  }
  
  // Subregion selected (onboarding)
  if (customId.startsWith('onboarding_subregion_')) {
    const parts = customId.replace('onboarding_subregion_', '').split('_');
    const regionKey = parts[0];
    const subregionKey = parts.slice(1).join('_');
    const subregion = TIMEZONE_DATA[regionKey].subregions[subregionKey];
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📋 Onboarding - Step 1 of 2`)
      .setDescription(`**Set Your Timezone - ${subregion.name}**\n\nSelect your timezone from the dropdown below.`)
      .setFooter({ text: 'Step 1: Timezone • Step 2: Minecraft Account' });
    
    const components = createOnboardingTimezoneSelect(regionKey, subregionKey);
    await interaction.update({ embeds: [embed], components });
    return;
  }
  
  // Link Minecraft button (step 2)
  if (customId === 'onboarding_link_minecraft') {
    const modal = new ModalBuilder()
      .setCustomId('onboarding_minecraft_modal')
      .setTitle('Link Your Minecraft Account');
    
    const usernameInput = new TextInputBuilder()
      .setCustomId('minecraft_username')
      .setLabel('Minecraft Username')
      .setPlaceholder('Enter your Minecraft username (case-insensitive)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(16);
    
    const row = new ActionRowBuilder().addComponents(usernameInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
    return;
  }
}

// Handle onboarding select menus
async function handleOnboardingSelect(interaction, client) {
  const customId = interaction.customId;
  const timezone = interaction.values[0];
  
  // Save timezone to database
  await UserTimezone.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: interaction.user.id },
    { timezone },
    { upsert: true }
  );
  
  // Update onboarding state
  const state = onboardingState.get(interaction.user.id) || { step: 1 };
  state.timezone = timezone;
  state.step = 2;
  onboardingState.set(interaction.user.id, state);
  
  // Log to moderator channel
  await logToModeratorChannel(
    interaction.guild,
    `🕐 **Onboarding Progress**\n${interaction.user} (${interaction.user.tag}) has set their timezone to **${timezone}**.`
  );
  
  // Get current time in their timezone
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Onboarding - Step 2 of 2')
    .setDescription(
      `✅ **Timezone set!**\nYour local time: ${timeStr}\n\n` +
      `**Link Your Minecraft Account**\n\nClick the button below to link your Minecraft account.`
    )
    .setFooter({ text: 'Step 1: ✅ Complete • Step 2: Minecraft Account' });
  
  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('onboarding_link_minecraft')
      .setLabel('🎮 Link Minecraft Account')
      .setStyle(ButtonStyle.Primary)
  );
  
  await interaction.update({ embeds: [embed], components: [button] });
}

// Handle onboarding modal submissions
async function handleOnboardingModal(interaction, client) {
  const minecraftUsername = interaction.fields.getTextInputValue('minecraft_username');
  
  // Check if username is already linked to someone else
  const existingLink = await LinkedAccount.findOne({
    guildId: interaction.guild.id,
    minecraftUsernameLower: minecraftUsername.toLowerCase(),
  });
  
  if (existingLink && existingLink.userId !== interaction.user.id) {
    await interaction.reply({
      content: `❌ The Minecraft account **${minecraftUsername}** is already linked to another user!`,
      ephemeral: true,
    });
    return;
  }
  
  // Save or update linked account
  await LinkedAccount.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: interaction.user.id },
    {
      minecraftUsername: minecraftUsername,
      minecraftUsernameLower: minecraftUsername.toLowerCase(),
    },
    { upsert: true }
  );
  
  // Get config for role assignments
  const config = await BotConfig.findOne({ guildId: interaction.guild.id });
  
  if (config) {
    const member = interaction.member;
    
    // Remove unverified role
    if (config.unverifiedRoleId) {
      const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        await member.roles.remove(unverifiedRole).catch(err => {
          console.error('Failed to remove unverified role:', err);
        });
      }
    }
    
    // Add verified role
    if (config.verifiedRoleId) {
      const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
      if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
        await member.roles.add(verifiedRole).catch(err => {
          console.error('Failed to add verified role:', err);
        });
      }
    }
  }
  
  // Clear onboarding state
  onboardingState.delete(interaction.user.id);
  
  // Log to moderator channel
  await logToModeratorChannel(
    interaction.guild,
    `✅ **Onboarding Complete**\n${interaction.user} (${interaction.user.tag}) has completed onboarding!\n🎮 Minecraft: **${minecraftUsername}**`
  );
  
  // Get timezone for display
  const userTimezone = await UserTimezone.findOne({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
  });
  
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🎉 Onboarding Complete!')
    .setDescription(
      `Welcome to the server, ${interaction.user}!\n\n` +
      `**Your Setup:**\n` +
      `🕐 Timezone: ${userTimezone ? userTimezone.timezone : 'Not set'}\n` +
      `🎮 Minecraft: ${minecraftUsername}\n\n` +
      `You now have full access to the server. Enjoy!`
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

// Helper functions for onboarding UI
function createOnboardingRegionButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('onboarding_region_americas').setLabel('🌎 Americas').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('onboarding_region_europe').setLabel('🌍 Europe').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('onboarding_region_asia').setLabel('🌏 Asia').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('onboarding_region_oceania').setLabel('🌊 Oceania').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('onboarding_region_africa').setLabel('🌍 Africa').setStyle(ButtonStyle.Primary),
  );
  return [row1, row2];
}

function createOnboardingSubregionButtons(regionKey) {
  const region = TIMEZONE_DATA[regionKey];
  const subregions = Object.entries(region.subregions);
  const rows = [];
  
  for (let i = 0; i < subregions.length; i += 3) {
    const row = new ActionRowBuilder();
    const chunk = subregions.slice(i, i + 3);
    
    for (const [subKey, subData] of chunk) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`onboarding_subregion_${regionKey}_${subKey}`)
          .setLabel(subData.name)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  
  // Add back button
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('onboarding_back_regions').setLabel('⬅️ Back to Regions').setStyle(ButtonStyle.Danger)
  ));
  
  return rows;
}

function createOnboardingTimezoneSelect(regionKey, subregionKey) {
  const timezones = TIMEZONE_DATA[regionKey].subregions[subregionKey].timezones;
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`onboarding_tz_select_${regionKey}_${subregionKey}`)
    .setPlaceholder('Select your timezone...')
    .addOptions(timezones.map(tz => ({
      label: tz.label,
      value: tz.value,
    })));
  
  const backButton = new ButtonBuilder()
    .setCustomId(`onboarding_back_subregions_${regionKey}`)
    .setLabel('⬅️ Back to Subregions')
    .setStyle(ButtonStyle.Danger);
  
  return [
    new ActionRowBuilder().addComponents(selectMenu),
    new ActionRowBuilder().addComponents(backButton),
  ];
}

module.exports = {
  handleTimezoneButton,
  handleTimezoneSelect,
  handleOnboardingButton,
  handleOnboardingSelect,
  handleOnboardingModal,
};
