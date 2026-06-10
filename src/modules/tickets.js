import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } from 'discord.js';

const OPEN_ID = 'ticket_open';
const CLOSE_ID = 'ticket_close';

function ticketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(OPEN_ID).setLabel('Ouvrir un ticket').setStyle(ButtonStyle.Primary)
  );
}

function closeRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_ID).setLabel('Fermer').setStyle(ButtonStyle.Danger)
  );
}

export async function sendTicketPanel(client, guild, channelId) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;
  await channel.send({ content: 'Panel Ticket', components: [ticketRow()] });
  return true;
}

export function registerTicketInteractions(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;

    if (interaction.customId === OPEN_ID) {
      const conf = client.db.prepare('SELECT enabled, category_id, support_role_id FROM tickets_config WHERE guild_id = ?').get(interaction.guildId);
      if (!conf?.enabled) {
        await interaction.reply({ content: 'Tickets désactivés.', ephemeral: true });
        return;
      }

      const existing = client.db.prepare('SELECT channel_id FROM tickets WHERE guild_id = ? AND owner_id = ? AND closed_at IS NULL').get(interaction.guildId, interaction.user.id);
      if (existing?.channel_id) {
        await interaction.reply({ content: `Tu as déjà un ticket ouvert: <#${existing.channel_id}>`, ephemeral: true });
        return;
      }

      const guild = interaction.guild;
      const categoryId = conf.category_id || null;
      const supportRoleId = conf.support_role_id || null;

      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
      ];
      if (supportRoleId) {
        overwrites.push({ id: supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
      }

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`.slice(0, 90),
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        permissionOverwrites: overwrites
      });

      client.db.prepare('INSERT INTO tickets (guild_id, channel_id, owner_id, created_at) VALUES (?, ?, ?, ?)').run(interaction.guildId, channel.id, interaction.user.id, Date.now());

      const supportMention = supportRoleId ? ` | <@&${supportRoleId}>` : '';
      await channel.send({ content: `<@${interaction.user.id}> Ticket créé.${supportMention}`, components: [closeRow()] });
      await interaction.reply({ content: `Ticket créé: <#${channel.id}>`, ephemeral: true });
      return;
    }

    if (interaction.customId === CLOSE_ID) {
      const ticket = client.db.prepare('SELECT owner_id FROM tickets WHERE channel_id = ? AND closed_at IS NULL').get(interaction.channelId);
      if (!ticket) {
        await interaction.reply({ content: 'Ce salon n’est pas un ticket actif.', ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const conf = client.db.prepare('SELECT support_role_id, transcript_channel_id FROM tickets_config WHERE guild_id = ?').get(interaction.guildId);
      const supportRoleId = conf?.support_role_id || null;
      const isSupport = supportRoleId && member?.roles?.cache?.has(supportRoleId);
      const isOwner = interaction.user.id === ticket.owner_id;
      const isStaff = member?.permissions.has(PermissionsBitField.Flags.ManageChannels) || member?.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!isOwner && !isSupport && !isStaff) {
        await interaction.reply({ content: 'Tu ne peux pas fermer ce ticket.', ephemeral: true });
        return;
      }

      client.db.prepare('UPDATE tickets SET closed_at = ? WHERE channel_id = ?').run(Date.now(), interaction.channelId);

      await interaction.reply({ content: 'Ticket fermé. Suppression dans 5s.', ephemeral: true });
      setTimeout(async () => {
        await interaction.channel?.delete().catch(() => null);
      }, 5000);
      return;
    }
  });
}

export function setTicketConfig(db, guildId, conf) {
  const row = db.prepare('SELECT guild_id FROM tickets_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT INTO tickets_config (guild_id, enabled, panel_channel_id, category_id, support_role_id, transcript_channel_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(guildId, conf.enabled ? 1 : 0, conf.panelChannelId || null, conf.categoryId || null, conf.supportRoleId || null, conf.transcriptChannelId || null);
  } else {
    db.prepare('UPDATE tickets_config SET enabled = ?, panel_channel_id = ?, category_id = ?, support_role_id = ?, transcript_channel_id = ? WHERE guild_id = ?')
      .run(conf.enabled ? 1 : 0, conf.panelChannelId || null, conf.categoryId || null, conf.supportRoleId || null, conf.transcriptChannelId || null, guildId);
  }
}
