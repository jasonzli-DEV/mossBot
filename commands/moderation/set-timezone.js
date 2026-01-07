const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const UserTimezone = require('../../schemas/UserTimezone');

// Timezone data organized by region
const TIMEZONE_DATA = {
  americas: {
    name: '🌎 Americas',
    subregions: {
      north_america: {
        name: '🇺🇸 North America',
        timezones: [
          { label: 'Eastern Time (ET)', value: 'America/New_York' },
          { label: 'Central Time (CT)', value: 'America/Chicago' },
          { label: 'Mountain Time (MT)', value: 'America/Denver' },
          { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
          { label: 'Alaska Time (AKT)', value: 'America/Anchorage' },
          { label: 'Hawaii Time (HST)', value: 'Pacific/Honolulu' },
          { label: 'Atlantic Time (AT)', value: 'America/Halifax' },
          { label: 'Newfoundland Time', value: 'America/St_Johns' },
        ],
      },
      central_america: {
        name: '🇲🇽 Central America',
        timezones: [
          { label: 'Mexico City Time', value: 'America/Mexico_City' },
          { label: 'Guatemala Time', value: 'America/Guatemala' },
          { label: 'Costa Rica Time', value: 'America/Costa_Rica' },
          { label: 'Panama Time', value: 'America/Panama' },
        ],
      },
      south_america: {
        name: '🇧🇷 South America',
        timezones: [
          { label: 'São Paulo Time (BRT)', value: 'America/Sao_Paulo' },
          { label: 'Buenos Aires Time (ART)', value: 'America/Argentina/Buenos_Aires' },
          { label: 'Lima Time (PET)', value: 'America/Lima' },
          { label: 'Bogota Time (COT)', value: 'America/Bogota' },
          { label: 'Santiago Time (CLT)', value: 'America/Santiago' },
          { label: 'Caracas Time (VET)', value: 'America/Caracas' },
        ],
      },
      caribbean: {
        name: '🏝️ Caribbean',
        timezones: [
          { label: 'Puerto Rico Time (AST)', value: 'America/Puerto_Rico' },
          { label: 'Jamaica Time (EST)', value: 'America/Jamaica' },
          { label: 'Cuba Time', value: 'America/Havana' },
          { label: 'Dominican Republic Time', value: 'America/Santo_Domingo' },
        ],
      },
    },
  },
  europe: {
    name: '🌍 Europe',
    subregions: {
      western_europe: {
        name: '🇬🇧 Western Europe',
        timezones: [
          { label: 'London Time (GMT/BST)', value: 'Europe/London' },
          { label: 'Paris Time (CET)', value: 'Europe/Paris' },
          { label: 'Berlin Time (CET)', value: 'Europe/Berlin' },
          { label: 'Amsterdam Time (CET)', value: 'Europe/Amsterdam' },
          { label: 'Madrid Time (CET)', value: 'Europe/Madrid' },
          { label: 'Lisbon Time (WET)', value: 'Europe/Lisbon' },
        ],
      },
      eastern_europe: {
        name: '🇵🇱 Eastern Europe',
        timezones: [
          { label: 'Warsaw Time (CET)', value: 'Europe/Warsaw' },
          { label: 'Kyiv Time (EET)', value: 'Europe/Kyiv' },
          { label: 'Bucharest Time (EET)', value: 'Europe/Bucharest' },
          { label: 'Athens Time (EET)', value: 'Europe/Athens' },
          { label: 'Helsinki Time (EET)', value: 'Europe/Helsinki' },
        ],
      },
      northern_europe: {
        name: '🇸🇪 Northern Europe',
        timezones: [
          { label: 'Stockholm Time (CET)', value: 'Europe/Stockholm' },
          { label: 'Oslo Time (CET)', value: 'Europe/Oslo' },
          { label: 'Copenhagen Time (CET)', value: 'Europe/Copenhagen' },
          { label: 'Reykjavik Time (GMT)', value: 'Atlantic/Reykjavik' },
        ],
      },
      russia: {
        name: '🇷🇺 Russia',
        timezones: [
          { label: 'Moscow Time (MSK)', value: 'Europe/Moscow' },
          { label: 'Yekaterinburg Time', value: 'Asia/Yekaterinburg' },
          { label: 'Vladivostok Time', value: 'Asia/Vladivostok' },
        ],
      },
    },
  },
  asia: {
    name: '🌏 Asia',
    subregions: {
      east_asia: {
        name: '🇯🇵 East Asia',
        timezones: [
          { label: 'Japan Time (JST)', value: 'Asia/Tokyo' },
          { label: 'Korea Time (KST)', value: 'Asia/Seoul' },
          { label: 'China Time (CST)', value: 'Asia/Shanghai' },
          { label: 'Hong Kong Time (HKT)', value: 'Asia/Hong_Kong' },
          { label: 'Taiwan Time (CST)', value: 'Asia/Taipei' },
        ],
      },
      southeast_asia: {
        name: '🇸🇬 Southeast Asia',
        timezones: [
          { label: 'Singapore Time (SGT)', value: 'Asia/Singapore' },
          { label: 'Bangkok Time (ICT)', value: 'Asia/Bangkok' },
          { label: 'Manila Time (PHT)', value: 'Asia/Manila' },
          { label: 'Jakarta Time (WIB)', value: 'Asia/Jakarta' },
          { label: 'Vietnam Time (ICT)', value: 'Asia/Ho_Chi_Minh' },
          { label: 'Malaysia Time (MYT)', value: 'Asia/Kuala_Lumpur' },
        ],
      },
      south_asia: {
        name: '🇮🇳 South Asia',
        timezones: [
          { label: 'India Time (IST)', value: 'Asia/Kolkata' },
          { label: 'Pakistan Time (PKT)', value: 'Asia/Karachi' },
          { label: 'Bangladesh Time (BST)', value: 'Asia/Dhaka' },
          { label: 'Sri Lanka Time', value: 'Asia/Colombo' },
          { label: 'Nepal Time (NPT)', value: 'Asia/Kathmandu' },
        ],
      },
      middle_east: {
        name: '🇦🇪 Middle East',
        timezones: [
          { label: 'Dubai Time (GST)', value: 'Asia/Dubai' },
          { label: 'Israel Time (IST)', value: 'Asia/Jerusalem' },
          { label: 'Turkey Time (TRT)', value: 'Europe/Istanbul' },
          { label: 'Saudi Arabia Time (AST)', value: 'Asia/Riyadh' },
          { label: 'Iran Time (IRST)', value: 'Asia/Tehran' },
        ],
      },
    },
  },
  oceania: {
    name: '🌊 Oceania',
    subregions: {
      australia: {
        name: '🇦🇺 Australia',
        timezones: [
          { label: 'Sydney Time (AEST/AEDT)', value: 'Australia/Sydney' },
          { label: 'Melbourne Time (AEST/AEDT)', value: 'Australia/Melbourne' },
          { label: 'Brisbane Time (AEST)', value: 'Australia/Brisbane' },
          { label: 'Perth Time (AWST)', value: 'Australia/Perth' },
          { label: 'Adelaide Time (ACST/ACDT)', value: 'Australia/Adelaide' },
          { label: 'Darwin Time (ACST)', value: 'Australia/Darwin' },
        ],
      },
      pacific: {
        name: '🇳🇿 Pacific Islands',
        timezones: [
          { label: 'New Zealand Time (NZST/NZDT)', value: 'Pacific/Auckland' },
          { label: 'Fiji Time (FJT)', value: 'Pacific/Fiji' },
          { label: 'Samoa Time', value: 'Pacific/Apia' },
          { label: 'Guam Time (ChST)', value: 'Pacific/Guam' },
          { label: 'Papua New Guinea Time', value: 'Pacific/Port_Moresby' },
        ],
      },
    },
  },
  africa: {
    name: '🌍 Africa',
    subregions: {
      north_africa: {
        name: '🇪🇬 North Africa',
        timezones: [
          { label: 'Cairo Time (EET)', value: 'Africa/Cairo' },
          { label: 'Morocco Time (WET)', value: 'Africa/Casablanca' },
          { label: 'Tunisia Time (CET)', value: 'Africa/Tunis' },
        ],
      },
      west_africa: {
        name: '🇳🇬 West Africa',
        timezones: [
          { label: 'Lagos Time (WAT)', value: 'Africa/Lagos' },
          { label: 'Ghana Time (GMT)', value: 'Africa/Accra' },
          { label: 'Senegal Time (GMT)', value: 'Africa/Dakar' },
        ],
      },
      east_africa: {
        name: '🇰🇪 East Africa',
        timezones: [
          { label: 'Nairobi Time (EAT)', value: 'Africa/Nairobi' },
          { label: 'Addis Ababa Time (EAT)', value: 'Africa/Addis_Ababa' },
          { label: 'Dar es Salaam Time (EAT)', value: 'Africa/Dar_es_Salaam' },
        ],
      },
      south_africa: {
        name: '🇿🇦 Southern Africa',
        timezones: [
          { label: 'Johannesburg Time (SAST)', value: 'Africa/Johannesburg' },
          { label: 'Cape Town Time (SAST)', value: 'Africa/Johannesburg' },
        ],
      },
    },
  },
};

// Create region selection buttons
function createRegionButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tz_region_americas').setLabel('🌎 Americas').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tz_region_europe').setLabel('🌍 Europe').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tz_region_asia').setLabel('🌏 Asia').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tz_region_oceania').setLabel('🌊 Oceania').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tz_region_africa').setLabel('🌍 Africa').setStyle(ButtonStyle.Primary),
  );
  return [row1, row2];
}

// Create subregion buttons for a given region
function createSubregionButtons(regionKey) {
  const region = TIMEZONE_DATA[regionKey];
  const subregions = Object.entries(region.subregions);
  const rows = [];
  
  for (let i = 0; i < subregions.length; i += 3) {
    const row = new ActionRowBuilder();
    const chunk = subregions.slice(i, i + 3);
    
    for (const [subKey, subData] of chunk) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`tz_subregion_${regionKey}_${subKey}`)
          .setLabel(subData.name)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  
  // Add back button
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tz_back_regions').setLabel('⬅️ Back to Regions').setStyle(ButtonStyle.Danger)
  ));
  
  return rows;
}

// Create timezone select menu for a subregion
function createTimezoneSelect(regionKey, subregionKey) {
  const timezones = TIMEZONE_DATA[regionKey].subregions[subregionKey].timezones;
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tz_select_${regionKey}_${subregionKey}`)
    .setPlaceholder('Select your timezone...')
    .addOptions(timezones.map(tz => ({
      label: tz.label,
      value: tz.value,
      description: `UTC${getTimezoneOffset(tz.value)}`,
    })));
  
  const backButton = new ButtonBuilder()
    .setCustomId(`tz_back_subregions_${regionKey}`)
    .setLabel('⬅️ Back to Subregions')
    .setStyle(ButtonStyle.Danger);
  
  return [
    new ActionRowBuilder().addComponents(selectMenu),
    new ActionRowBuilder().addComponents(backButton),
  ];
}

// Get timezone offset string
function getTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart ? offsetPart.value.replace('GMT', '') : '';
  } catch {
    return '';
  }
}

// Create embeds for each step
function createRegionEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🌍 Set Your Timezone')
    .setDescription('**Step 1:** Select your region from the buttons below.')
    .setFooter({ text: 'Your timezone will be used to display your local time to others.' });
}

function createSubregionEmbed(regionKey) {
  const region = TIMEZONE_DATA[regionKey];
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🌍 Set Your Timezone - ${region.name}`)
    .setDescription('**Step 2:** Select your subregion from the buttons below.')
    .setFooter({ text: 'Click "Back to Regions" to choose a different region.' });
}

function createTimezoneEmbed(regionKey, subregionKey) {
  const region = TIMEZONE_DATA[regionKey];
  const subregion = region.subregions[subregionKey];
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🌍 Set Your Timezone - ${subregion.name}`)
    .setDescription('**Step 3:** Select your timezone from the dropdown menu below.')
    .setFooter({ text: 'Click "Back to Subregions" to choose a different subregion.' });
}

function createSuccessEmbed(timezone) {
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ Timezone Set!')
    .setDescription(`Your timezone has been set to:\n**${timezone}**\n\nYour current local time:\n**${timeStr}**`)
    .setFooter({ text: 'Other users can now see your local time using /local-time' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-timezone')
    .setDescription('Set your timezone so others can see your local time'),

  async execute(interaction, client) {
    const embed = createRegionEmbed();
    const buttons = createRegionButtons();
    
    await interaction.reply({
      embeds: [embed],
      components: buttons,
    });
  },
  
  // Export helper functions and data for use in interaction handlers
  TIMEZONE_DATA,
  createRegionButtons,
  createSubregionButtons,
  createTimezoneSelect,
  createRegionEmbed,
  createSubregionEmbed,
  createTimezoneEmbed,
  createSuccessEmbed,
  getTimezoneOffset,
};
