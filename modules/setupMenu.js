import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChannelSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

const SETUP_SELECT_ID = 'setup_select';
const SETUP_BACK_ID = 'setup_back';
const SETUP_CONFIGURE_ID = 'setup_configure';
const MODAL_PREFIX_ID = 'modal_prefix';
const MODAL_CONFESSION_ID = 'modal_confession';
const MODAL_JOIN_ID = 'modal_join';
const MODAL_COUNTERS_ID = 'modal_counters';
const MODAL_BADWORDS_ID = 'modal_badwords';
const MODAL_TICKETS_ID = 'modal_tickets';

function mainMenuRow(current = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SETUP_SELECT_ID)
      .setPlaceholder('Accueil')
      .addOptions(
        { label: 'Accueil', value: 'home', description: 'Menu principal', default: current === 'home' },
        { label: 'General', value: 'general', description: 'Prefix / Confession / Join', default: current === 'general' },
        { label: 'Gestion', value: 'gestion', description: 'Counters / Tickets', default: current === 'gestion' },
        { label: 'Antiraid', value: 'antiraid', description: 'antilink / antibot / antiping / badwords', default: current === 'antiraid' }
      )
  );
}

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(SETUP_BACK_ID).setLabel('Retour').setStyle(ButtonStyle.Secondary)
  );
}

function configureRow(section) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${SETUP_CONFIGURE_ID}:${section}`).setLabel('Configurer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(SETUP_BACK_ID).setLabel('Retour').setStyle(ButtonStyle.Secondary)
  );
}

function requireManageGuild(interaction) {
  const member = interaction.member;
  if (!member?.permissions) return false;
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
}

function getOrCreateGuildConfig(db, guildId) {
  const row = db.prepare('SELECT guild_id FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!row) db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
}

function getOrCreateAntiRaidConfig(db, guildId) {
  const row = db.prepare('SELECT guild_id FROM antiraid_config WHERE guild_id = ?').get(guildId);
  if (!row) db.prepare('INSERT INTO antiraid_config (guild_id) VALUES (?)').run(guildId);
}

function getOrCreateTicketsConfig(db, guildId) {
  const row = db.prepare('SELECT guild_id FROM tickets_config WHERE guild_id = ?').get(guildId);
  if (!row) db.prepare('INSERT INTO tickets_config (guild_id) VALUES (?)').run(guildId);
}

function homeEmbed(guildName) {
  return new EmbedBuilder()
    .setTitle('Accueil')
    .setDescription(`Serveur: **${guildName}**\n\nChoisis une catégorie dans le menu ci-dessous.`)
    .setColor(0x2b2d31);
}

function sectionEmbed(section, guild, db) {
  const e = new EmbedBuilder().setColor(0x2b2d31);

  if (section === 'general') {
    const row = db.prepare('SELECT prefix, confession_channel_id, join_channel_id, join_message FROM guild_config WHERE guild_id = ?').get(guild.id);
    const prefix = row?.prefix ?? '!';
    const confession = row?.confession_channel_id ? `<#${row.confession_channel_id}>` : 'Non configuré';
    const join = row?.join_channel_id ? `<#${row.join_channel_id}>` : 'Non configuré';
    const joinMsg = row?.join_message ? (row.join_message.length > 150 ? `${row.join_message.slice(0, 150)}...` : row.join_message) : '—';

    e.setTitle('General')
      .addFields(
        { name: 'Prefix', value: `\`${prefix}\``, inline: true },
        { name: 'Confession', value: confession, inline: true },
        { name: 'Join', value: join, inline: true },
        { name: 'Join message', value: joinMsg }
      );
    return e;
  }

  if (section === 'gestion') {
    const counters = db.prepare('SELECT enabled, member_channel_id, bot_channel_id FROM counters_config WHERE guild_id = ?').get(guild.id);
    const tickets = db.prepare('SELECT enabled, panel_channel_id, category_id, support_role_id FROM tickets_config WHERE guild_id = ?').get(guild.id);

    e.setTitle('Gestion')
      .addFields(
        {
          name: 'Counters',
          value: counters?.enabled
            ? `Membres: ${counters.member_channel_id ? `<#${counters.member_channel_id}>` : '—'}\nBots: ${counters.bot_channel_id ? `<#${counters.bot_channel_id}>` : '—'}`
            : 'Désactivé'
        },
        {
          name: 'Tickets',
          value: tickets?.enabled
            ? `Panel: ${tickets.panel_channel_id ? `<#${tickets.panel_channel_id}>` : '—'}\nCatégorie: ${tickets.category_id ? `<#${tickets.category_id}>` : '—'}\nRôle support: ${tickets.support_role_id ? `<@&${tickets.support_role_id}>` : '—'}`
            : 'Désactivé'
        }
      );
    return e;
  }

  if (section === 'antiraid') {
    const row = db.prepare('SELECT antilink, antibot, antiping, badwords, badwords_list FROM antiraid_config WHERE guild_id = ?').get(guild.id);
    const onOff = (v) => (v ? 'on' : 'off');
    const list = row?.badwords_list ? row.badwords_list.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20).join(', ') : '—';
    e.setTitle('Antiraid')
      .addFields(
        { name: 'antilink', value: onOff(row?.antilink), inline: true },
        { name: 'antibot', value: onOff(row?.antibot), inline: true },
        { name: 'antiping', value: onOff(row?.antiping), inline: true },
        { name: 'badwords', value: onOff(row?.badwords) },
        { name: 'badwords list (max 20)', value: list }
      );
    return e;
  }

  return homeEmbed(guild.name);
}

export async function sendSetupMenu(message) {
  await message.reply({
    embeds: [homeEmbed(message.guild?.name || 'Serveur')],
    components: [mainMenuRow('home')]
  });
}

function buildModal(id, title, inputs) {
  const modal = new ModalBuilder().setCustomId(id).setTitle(title);
  const rows = inputs.map((i) => new ActionRowBuilder().addComponents(i));
  modal.addComponents(...rows);
  return modal;
}

export function registerSetupMenu(client) {
  if (!client._setupSelections) client._setupSelections = new Map();

  const getSel = (userId, key) => client._setupSelections.get(`${userId}:${key}`) || null;
  const setSel = (userId, key, val) => client._setupSelections.set(`${userId}:${key}`, val);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.guildId) return;

    if (interaction.isStringSelectMenu() && interaction.customId === SETUP_SELECT_ID) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }

      const value = interaction.values?.[0];
      if (!value) return;

      if (value === 'home') {
        await interaction.update({
          embeds: [homeEmbed(interaction.guild.name)],
          components: [mainMenuRow('home')]
        });
        return;
      }

      if (value === 'general' || value === 'gestion' || value === 'antiraid') {
        await interaction.update({
          embeds: [sectionEmbed(value, interaction.guild, client.db)],
          components: [mainMenuRow(value), configureRow(value)]
        });
        return;
      }

      await interaction.reply({ content: 'Option inconnue.', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith(`${SETUP_CONFIGURE_ID}:`)) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }

      const section = interaction.customId.split(':')[1];
      if (section === 'general') {
        const row = client.db.prepare('SELECT prefix, confession_channel_id, join_channel_id, join_message FROM guild_config WHERE guild_id = ?').get(interaction.guild.id);
        const prefix = row?.prefix ?? '!';
        const confession = row?.confession_channel_id ? `<#${row.confession_channel_id}>` : 'Non configuré';
        const join = row?.join_channel_id ? `<#${row.join_channel_id}>` : 'Non configuré';

        const embed = new EmbedBuilder()
          .setTitle('Setup General')
          .setColor(0x2b2d31)
          .addFields(
            { name: 'Prefix', value: `\`${prefix}\``, inline: true },
            { name: 'Confession', value: confession, inline: true },
            { name: 'Bienvenue', value: join, inline: true }
          );

        const btns = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('gen_edit_prefix').setLabel('Modifier Prefix').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('gen_edit_confession').setLabel('Modifier Confession').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('gen_edit_join').setLabel('Modifier Bienvenue').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [btns], ephemeral: true });
        return;
      }

      if (section === 'gestion') {
        const memberCh = new ChannelSelectMenuBuilder().setCustomId('gestion_member_channel').setPlaceholder('Vocal Membres (optionnel)').setMinValues(0).setMaxValues(1).setChannelTypes(ChannelType.GuildVoice);
        const botCh = new ChannelSelectMenuBuilder().setCustomId('gestion_bot_channel').setPlaceholder('Vocal Bots (optionnel)').setMinValues(0).setMaxValues(1).setChannelTypes(ChannelType.GuildVoice);
        const panelCh = new ChannelSelectMenuBuilder().setCustomId('gestion_panel_channel').setPlaceholder('Salon panel tickets (optionnel)').setMinValues(0).setMaxValues(1).setChannelTypes(ChannelType.GuildText);
        const supportRole = new RoleSelectMenuBuilder().setCustomId('gestion_support_role').setPlaceholder('Rôle support tickets (optionnel)').setMinValues(0).setMaxValues(1);

        const embed = new EmbedBuilder().setTitle('Setup Gestion').setColor(0x2b2d31).setDescription('Choisis les salons et rôles ci-dessous.');
        await interaction.reply({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(memberCh),
            new ActionRowBuilder().addComponents(botCh),
            new ActionRowBuilder().addComponents(panelCh),
            new ActionRowBuilder().addComponents(supportRole),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gestion_save').setLabel('Sauvegarder').setStyle(ButtonStyle.Primary))
          ],
          ephemeral: true
        });
        return;
      }

      if (section === 'antiraid') {
        const row = client.db.prepare('SELECT antilink, antibot, antiping, badwords, badwords_list FROM antiraid_config WHERE guild_id = ?').get(interaction.guild.id);
        const onOff = (v) => v ? 'on' : 'off';
        const toggleBtn = (key, label) => {
          const active = row?.[key] ? true : false;
          return new ButtonBuilder()
            .setCustomId(`toggle_${key}`)
            .setLabel(`${label}: ${onOff(row?.[key])}`)
            .setStyle(active ? ButtonStyle.Success : ButtonStyle.Secondary);
        };

        const embed = new EmbedBuilder()
          .setTitle('Setup Antiraid')
          .setColor(0x2b2d31)
          .addFields(
            { name: 'État actuel', value: `antilink: ${onOff(row?.antilink)}\nantibot: ${onOff(row?.antibot)}\nantiping: ${onOff(row?.antiping)}\nbadwords: ${onOff(row?.badwords)}` }
          );

        const row1 = new ActionRowBuilder().addComponents(
          toggleBtn('antilink', 'Antilink'),
          toggleBtn('antibot', 'Antibot'),
          toggleBtn('antiping', 'Antiping')
        );
        const row2 = new ActionRowBuilder().addComponents(
          toggleBtn('badwords', 'Badwords'),
          new ButtonBuilder().setCustomId('badwords_list').setLabel('Liste mots').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('antiraid_back').setLabel('Retour').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
        return;
      }

      await interaction.reply({ content: 'Option inconnue.', ephemeral: true });
    }

    if (interaction.isChannelSelectMenu() && (interaction.customId.startsWith('general_') || interaction.customId.startsWith('gestion_'))) {
      const val = interaction.values?.[0] || null;
      setSel(interaction.user.id, interaction.customId, val);
      await interaction.deferUpdate();
      return;
    }

    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('gestion_')) {
      const val = interaction.values?.[0] || null;
      setSel(interaction.user.id, interaction.customId, val);
      await interaction.deferUpdate();
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_BACK_ID) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      await interaction.update({ embeds: [homeEmbed(interaction.guild.name)], components: [mainMenuRow('home')] });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'general_save') {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      const guild = interaction.guild;
      const db = client.db;
      const uid = interaction.user.id;

      const confCh = getSel(uid, 'general_confession_channel');
      const joinCh = getSel(uid, 'general_join_channel');

      getOrCreateGuildConfig(db, guild.id);

      if (confCh) db.prepare('UPDATE guild_config SET confession_channel_id = ? WHERE guild_id = ?').run(confCh, guild.id);
      if (joinCh) db.prepare('UPDATE guild_config SET join_channel_id = ? WHERE guild_id = ?').run(joinCh, guild.id);

      await interaction.update({ content: 'General sauvegardé.', embeds: [], components: [] });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'gestion_save') {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      const guild = interaction.guild;
      const db = client.db;
      const uid = interaction.user.id;

      const memberChannelId = getSel(uid, 'gestion_member_channel');
      const botChannelId = getSel(uid, 'gestion_bot_channel');
      const panelChannelId = getSel(uid, 'gestion_panel_channel');
      const supportRoleId = getSel(uid, 'gestion_support_role');

      if (memberChannelId || botChannelId) {
        const row = db.prepare('SELECT guild_id FROM counters_config WHERE guild_id = ?').get(guild.id);
        if (!row) db.prepare('INSERT INTO counters_config (guild_id, enabled, member_channel_id, bot_channel_id) VALUES (?, ?, ?, ?)').run(guild.id, 1, memberChannelId, botChannelId);
        else db.prepare('UPDATE counters_config SET enabled = 1, member_channel_id = ?, bot_channel_id = ? WHERE guild_id = ?').run(memberChannelId, botChannelId, guild.id);
      }

      if (panelChannelId) {
        getOrCreateTicketsConfig(db, guild.id);
        db.prepare('UPDATE tickets_config SET enabled = 1, panel_channel_id = ?, support_role_id = ? WHERE guild_id = ?')
          .run(panelChannelId, supportRoleId, guild.id);
      }

      await interaction.update({ content: 'Gestion sauvegardée.', embeds: [], components: [] });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('gen_edit_')) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      const action = interaction.customId.replace('gen_edit_', '');
      if (action === 'prefix') {
        const modal = new ModalBuilder().setCustomId('modal_prefix').setTitle('Modifier Prefix');
        const input = new TextInputBuilder().setCustomId('prefix').setLabel('Nouveau prefix (max 5)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
      if (action === 'confession') {
        const select = new ChannelSelectMenuBuilder().setCustomId('sel_confession').setPlaceholder('Choisis le salon confession').setMinValues(1).setMaxValues(1).setChannelTypes(ChannelType.GuildText);
        await interaction.reply({ content: 'Choisis le salon confession:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        return;
      }
      if (action === 'join') {
        const select = new ChannelSelectMenuBuilder().setCustomId('sel_join_channel').setPlaceholder('Choisis le salon bienvenue').setMinValues(1).setMaxValues(1).setChannelTypes(ChannelType.GuildText);
        await interaction.reply({ content: 'Choisis le salon bienvenue:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('toggle_')) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      const key = interaction.customId.replace('toggle_', '');
      const db = client.db;
      const guild = interaction.guild;
      getOrCreateAntiRaidConfig(db, guild.id);
      const current = db.prepare(`SELECT ${key} FROM antiraid_config WHERE guild_id = ?`).get(guild.id)?.[key];
      const newVal = current ? 0 : 1;
      db.prepare(`UPDATE antiraid_config SET ${key} = ? WHERE guild_id = ?`).run(newVal, guild.id);

      const row = db.prepare('SELECT antilink, antibot, antiping, badwords, badwords_list FROM antiraid_config WHERE guild_id = ?').get(guild.id);
      const onOff = (v) => v ? 'on' : 'off';
      const toggleBtn = (k, label) => {
        const active = row?.[k] ? true : false;
        return new ButtonBuilder().setCustomId(`toggle_${k}`).setLabel(`${label}: ${onOff(row?.[k])}`).setStyle(active ? ButtonStyle.Success : ButtonStyle.Secondary);
      };
      const embed = new EmbedBuilder().setTitle('Setup Antiraid').setColor(0x2b2d31)
        .addFields({ name: 'État actuel', value: `antilink: ${onOff(row?.antilink)}\nantibot: ${onOff(row?.antibot)}\nantiping: ${onOff(row?.antiping)}\nbadwords: ${onOff(row?.badwords)}` });
      const row1 = new ActionRowBuilder().addComponents(toggleBtn('antilink', 'Antilink'), toggleBtn('antibot', 'Antibot'), toggleBtn('antiping', 'Antiping'));
      const row2 = new ActionRowBuilder().addComponents(toggleBtn('badwords', 'Badwords'), new ButtonBuilder().setCustomId('badwords_list').setLabel('Liste mots').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('antiraid_back').setLabel('Retour').setStyle(ButtonStyle.Secondary));
      await interaction.update({ embeds: [embed], components: [row1, row2] });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'badwords_list') {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder().setCustomId('modal_badwords_list').setTitle('Modifier liste badwords');
      const input = new TextInputBuilder().setCustomId('list').setLabel('Mots interdits (séparés par virgule)').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('mot1, mot2, mot3... ou laisser vide pour désactiver');
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'antiraid_back') {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }
      await interaction.update({ embeds: [sectionEmbed('antiraid', interaction.guild, client.db)], components: [mainMenuRow('antiraid'), configureRow('antiraid')] });
      return;
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'sel_confession') {
      const channelId = interaction.values?.[0];
      if (!channelId) return;
      getOrCreateGuildConfig(client.db, interaction.guild.id);
      client.db.prepare('UPDATE guild_config SET confession_channel_id = ? WHERE guild_id = ?').run(channelId, interaction.guild.id);
      await interaction.update({ content: `Salon confession mis à jour: <#${channelId}>`, components: [] });
      return;
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'sel_join_channel') {
      const channelId = interaction.values?.[0];
      if (!channelId) return;
      getOrCreateGuildConfig(client.db, interaction.guild.id);
      client.db.prepare('UPDATE guild_config SET join_channel_id = ? WHERE guild_id = ?').run(channelId, interaction.guild.id);
      const modal = new ModalBuilder().setCustomId('modal_join_msg').setTitle('Message de bienvenue');
      const input = new TextInputBuilder().setCustomId('msg').setLabel('Message ({user} = pseudo, {server} = serveur)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1500);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (!requireManageGuild(interaction)) {
        await interaction.reply({ content: "Tu n'as pas la permission.", ephemeral: true });
        return;
      }

      const guild = interaction.guild;
      const db = client.db;

      if (interaction.customId === 'modal_general') {
        const prefix = interaction.fields.getTextInputValue('prefix')?.trim() || null;
        const joinMsg = interaction.fields.getTextInputValue('join_message')?.trim() || null;

        getOrCreateGuildConfig(db, guild.id);

        if (prefix) db.prepare('UPDATE guild_config SET prefix = ? WHERE guild_id = ?').run(prefix, guild.id);
        if (joinMsg) db.prepare('UPDATE guild_config SET join_message = ? WHERE guild_id = ?').run(joinMsg, guild.id);

        const confCh = new ChannelSelectMenuBuilder().setCustomId('general_confession_channel').setPlaceholder('Salon confession (optionnel)').setMinValues(0).setMaxValues(1).setChannelTypes(ChannelType.GuildText);
        const joinCh = new ChannelSelectMenuBuilder().setCustomId('general_join_channel').setPlaceholder('Salon bienvenue (optionnel)').setMinValues(0).setMaxValues(1).setChannelTypes(ChannelType.GuildText);

        const embed = new EmbedBuilder().setTitle('Setup General - Salons').setColor(0x2b2d31).setDescription('Prefix et message sauvegardés. Choisis les salons ci-dessous.');
        await interaction.reply({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(confCh),
            new ActionRowBuilder().addComponents(joinCh),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('general_save').setLabel('Sauvegarder').setStyle(ButtonStyle.Primary))
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === 'modal_gestion') {
        await interaction.reply({ content: 'Utilise le menu Gestion avec les sélecteurs.', ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_PREFIX_ID) {
        const prefix = interaction.fields.getTextInputValue('prefix').trim();
        getOrCreateGuildConfig(db, guild.id);
        db.prepare('UPDATE guild_config SET prefix = ? WHERE guild_id = ?').run(prefix, guild.id);
        await interaction.reply({ content: `Prefix mis à jour: ${prefix}`, ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_CONFESSION_ID) {
        const channelId = interaction.fields.getTextInputValue('channel').replace(/[^0-9]/g, '');
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({ content: 'Salon invalide.', ephemeral: true });
          return;
        }
        getOrCreateGuildConfig(db, guild.id);
        db.prepare('UPDATE guild_config SET confession_channel_id = ? WHERE guild_id = ?').run(channelId, guild.id);
        await interaction.reply({ content: `Salon confession: <#${channelId}>`, ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_JOIN_ID) {
        const channelId = interaction.fields.getTextInputValue('channel').replace(/[^0-9]/g, '');
        const msg = interaction.fields.getTextInputValue('message')?.trim() || null;
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({ content: 'Salon invalide.', ephemeral: true });
          return;
        }
        getOrCreateGuildConfig(db, guild.id);
        db.prepare('UPDATE guild_config SET join_channel_id = ?, join_message = ? WHERE guild_id = ?').run(channelId, msg, guild.id);
        await interaction.reply({ content: `Join configuré: <#${channelId}>`, ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_COUNTERS_ID) {
        const memberChannelId = (interaction.fields.getTextInputValue('member_channel') || '').replace(/[^0-9]/g, '') || null;
        const botChannelId = (interaction.fields.getTextInputValue('bot_channel') || '').replace(/[^0-9]/g, '') || null;

        const validateVoice = async (id) => {
          if (!id) return true;
          const ch = await guild.channels.fetch(id).catch(() => null);
          return !!ch && ch.type === ChannelType.GuildVoice;
        };

        if (!(await validateVoice(memberChannelId)) || !(await validateVoice(botChannelId))) {
          await interaction.reply({ content: 'Un des salons n’est pas un vocal.', ephemeral: true });
          return;
        }

        const row = db.prepare('SELECT guild_id FROM counters_config WHERE guild_id = ?').get(guild.id);
        if (!row) db.prepare('INSERT INTO counters_config (guild_id, enabled, member_channel_id, bot_channel_id) VALUES (?, ?, ?, ?)').run(guild.id, 1, memberChannelId, botChannelId);
        else db.prepare('UPDATE counters_config SET enabled = 1, member_channel_id = ?, bot_channel_id = ? WHERE guild_id = ?').run(memberChannelId, botChannelId, guild.id);

        await interaction.reply({ content: 'Counters configurés.', ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_BADWORDS_ID) {
        getOrCreateAntiRaidConfig(db, guild.id);

        const toggles = (interaction.fields.getTextInputValue('toggles') || '').toLowerCase();
        const bad = (interaction.fields.getTextInputValue('badwords') || '').trim();

        const setToggle = (key, on) => {
          db.prepare(`UPDATE antiraid_config SET ${key} = ? WHERE guild_id = ?`).run(on ? 1 : 0, guild.id);
        };

        if (toggles.includes('antilink=on')) setToggle('antilink', true);
        if (toggles.includes('antilink=off')) setToggle('antilink', false);
        if (toggles.includes('antibot=on')) setToggle('antibot', true);
        if (toggles.includes('antibot=off')) setToggle('antibot', false);
        if (toggles.includes('antiping=on')) setToggle('antiping', true);
        if (toggles.includes('antiping=off')) setToggle('antiping', false);

        if (bad) {
          const lower = bad.toLowerCase();
          if (lower === 'off') {
            db.prepare('UPDATE antiraid_config SET badwords = 0, badwords_list = NULL WHERE guild_id = ?').run(guild.id);
          } else if (lower === 'on') {
            db.prepare('UPDATE antiraid_config SET badwords = 1 WHERE guild_id = ?').run(guild.id);
          } else if (lower.startsWith('set ')) {
            const list = bad.slice(4).split(',').map((s) => s.trim()).filter(Boolean);
            db.prepare('UPDATE antiraid_config SET badwords = 1, badwords_list = ? WHERE guild_id = ?').run(list.join(','), guild.id);
          }
        }

        await interaction.reply({ content: 'Antiraid mis à jour.', ephemeral: true });
        return;
      }

      if (interaction.customId === MODAL_TICKETS_ID) {
        getOrCreateTicketsConfig(db, guild.id);

        const panelChannelId = interaction.fields.getTextInputValue('panel_channel').replace(/[^0-9]/g, '');
        const categoryId = (interaction.fields.getTextInputValue('category') || '').replace(/[^0-9]/g, '') || null;
        const supportRoleId = (interaction.fields.getTextInputValue('support_role') || '').replace(/[^0-9]/g, '') || null;

        const panel = await guild.channels.fetch(panelChannelId).catch(() => null);
        if (!panel || !panel.isTextBased()) {
          await interaction.reply({ content: 'Salon panel invalide.', ephemeral: true });
          return;
        }

        if (categoryId) {
          const cat = await guild.channels.fetch(categoryId).catch(() => null);
          if (!cat || cat.type !== ChannelType.GuildCategory) {
            await interaction.reply({ content: 'Catégorie invalide.', ephemeral: true });
            return;
          }
        }

        if (supportRoleId) {
          const role = await guild.roles.fetch(supportRoleId).catch(() => null);
          if (!role) {
            await interaction.reply({ content: 'Rôle support invalide.', ephemeral: true });
            return;
          }
        }

        db.prepare('UPDATE tickets_config SET enabled = 1, panel_channel_id = ?, category_id = ?, support_role_id = ? WHERE guild_id = ?')
          .run(panelChannelId, categoryId, supportRoleId, guild.id);

        await interaction.reply({ content: 'Tickets configurés. Utilise `!ticket settings` si tu veux renvoyer un panel.', ephemeral: true });
        return;
      }

      if (interaction.customId === 'modal_badwords_list') {
        getOrCreateAntiRaidConfig(db, guild.id);
        const list = interaction.fields.getTextInputValue('list')?.trim();
        if (!list) {
          db.prepare('UPDATE antiraid_config SET badwords = 0, badwords_list = NULL WHERE guild_id = ?').run(guild.id);
          await interaction.reply({ content: 'Badwords désactivé.', ephemeral: true });
        } else {
          const words = list.split(',').map((s) => s.trim()).filter(Boolean);
          db.prepare('UPDATE antiraid_config SET badwords = 1, badwords_list = ? WHERE guild_id = ?').run(words.join(','), guild.id);
          await interaction.reply({ content: `Badwords mis à jour: ${words.join(', ')}`, ephemeral: true });
        }
        return;
      }

      if (interaction.customId === 'modal_join_msg') {
        getOrCreateGuildConfig(db, guild.id);
        const msg = interaction.fields.getTextInputValue('msg')?.trim() || null;
        db.prepare('UPDATE guild_config SET join_message = ? WHERE guild_id = ?').run(msg, guild.id);
        await interaction.reply({ content: msg ? `Message de bienvenue mis à jour.` : 'Message de bienvenue supprimé.', ephemeral: true });
        return;
      }

      await interaction.reply({ content: 'Modal inconnu.', ephemeral: true });
    }
  });
}
