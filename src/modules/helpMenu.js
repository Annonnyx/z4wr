import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

const HELP_SELECT_ID = 'help_select';

function homeEmbed(prefix) {
  return new EmbedBuilder()
    .setTitle('Help')
    .setColor(0x2b2d31)
    .setDescription(`Prefix: **${prefix}**\n\nChoisis une catégorie dans le menu.`)
    .addFields(
      { name: 'Owner', value: '`owner` `unowner`', inline: false },
      {
        name: 'Modération',
        value: '`bl` `unbl` `ban` `unban` `addrole` `delrole` `mute` `unmute` `warn` `lock` `unlock` `voicemove` `clear` `banlist` `mutelist` `warnlist` `blacklist` `clearwarns` `dmall`',
        inline: false
      },
      { name: 'Antiraid', value: '`antilink` `antibot` `antiping` `badwords`', inline: false },
      { name: 'Tickets', value: '`ticket settings`', inline: false },
      { name: 'Config', value: '`setup` `activity` `confession` `join` `prefix` `counters`', inline: false },
      { name: 'Fun', value: '`banner` `mp` `say` `pic` `sniper` `stickers` `dog` `undog`', inline: false }
    );
}

function categoryEmbed(prefix, category) {
  const e = new EmbedBuilder().setColor(0x2b2d31);

  if (category === 'owner') {
    return e.setTitle('Help - Owner').setDescription(`Prefix: **${prefix}**\n\n` + ['`owner <@user|id>`', '`unowner <@user|id>`'].join('\n'));
  }

  if (category === 'moderation') {
    return e.setTitle('Help - Modération').setDescription(
      `Prefix: **${prefix}**\n\n` +
        [
          '`bl <@user|id> [raison]`',
          '`unbl <@user|id>`',
          '`ban <@user|id> [raison]`',
          '`unban <id>`',
          '`addrole <@user|id> <@role|id>`',
          '`delrole <@user|id> <@role|id>`',
          '`mute <@user|id> [durée] [raison]`',
          '`unmute <@user|id>`',
          '`warn <@user|id> [raison]`',
          '`warnlist [@user|id]`',
          '`clearwarns <@user|id>`',
          '`lock` / `unlock`',
          '`voicemove <@user|id> <idVoc>`',
          '`clear <1-100>`',
          '`banlist` / `mutelist` / `blacklist`',
          '`dmall <message>`'
        ].join('\n')
    );
  }

  if (category === 'antiraid') {
    return e.setTitle('Help - Antiraid').setDescription(
      `Prefix: **${prefix}**\n\n` +
        [
          '`antilink on|off`',
          '`antibot on|off`',
          '`antiping on|off`',
          '`badwords on|off`',
          '`badwords set mot1,mot2,mot3`'
        ].join('\n')
    );
  }

  if (category === 'tickets') {
    return e.setTitle('Help - Tickets').setDescription(`Prefix: **${prefix}**\n\n` + ['`ticket settings <idSalonPanel> [idCategorie] [idRoleSupport]`'].join('\n'));
  }

  if (category === 'config') {
    return e.setTitle('Help - Configuration').setDescription(
      `Prefix: **${prefix}**\n\n` +
        [
          '`setup` (menu interactif)',
          '`activity <texte>` (owner)',
          '`confession setup <#salon>`',
          '`confession <message>`',
          '`join <idSalon> [message]`',
          '`prefix <nouveauPrefix>`',
          '`counters <idVocMembres> <idVocBots>` | `counters off`'
        ].join('\n')
    );
  }

  if (category === 'fun') {
    return e.setTitle('Help - Fun').setDescription(
      `Prefix: **${prefix}**\n\n` +
        ['`banner [@user]`', '`mp <@user> <message>`', '`say <message>`', '`pic [@user]`', '`sniper`', '`stickers` (sur un message avec sticker)', '`dog <@user>`', '`undog <@user>`'].join('\n')
    );
  }

  return homeEmbed(prefix);
}

function selectRow(current = 'home') {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(HELP_SELECT_ID)
      .setPlaceholder('Accueil')
      .addOptions(
        { label: 'Accueil', value: 'home', default: current === 'home' },
        { label: 'Owner', value: 'owner', default: current === 'owner' },
        { label: 'Modération', value: 'moderation', default: current === 'moderation' },
        { label: 'Antiraid', value: 'antiraid', default: current === 'antiraid' },
        { label: 'Tickets', value: 'tickets', default: current === 'tickets' },
        { label: 'Config', value: 'config', default: current === 'config' },
        { label: 'Fun', value: 'fun', default: current === 'fun' }
      )
  );
}

export async function sendHelpMenu(message, prefix) {
  await message.reply({ embeds: [homeEmbed(prefix)], components: [selectRow('home')] });
}

export function registerHelpMenu(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== HELP_SELECT_ID) return;

    const prefix = client.getPrefix(interaction.guildId);
    const value = interaction.values?.[0] || 'home';
    const embed = value === 'home' ? homeEmbed(prefix) : categoryEmbed(prefix, value);

    await interaction.update({ embeds: [embed], components: [selectRow(value)] });
  });
}
