import { ChannelType } from 'discord.js';

async function updateGuildCounters(client, guild) {
  const row = client.db.prepare('SELECT enabled, member_channel_id, bot_channel_id FROM counters_config WHERE guild_id = ?').get(guild.id);
  if (!row?.enabled) return;

  const members = await guild.members.fetch().catch(() => null);
  if (!members) return;

  const humanCount = members.filter((m) => !m.user.bot).size;
  const botCount = members.filter((m) => m.user.bot).size;

  if (row.member_channel_id) {
    const ch = await guild.channels.fetch(row.member_channel_id).catch(() => null);
    if (ch && ch.type === ChannelType.GuildVoice) {
      await ch.setName(`Membres: ${humanCount}`).catch(() => null);
    }
  }
  if (row.bot_channel_id) {
    const ch = await guild.channels.fetch(row.bot_channel_id).catch(() => null);
    if (ch && ch.type === ChannelType.GuildVoice) {
      await ch.setName(`Bots: ${botCount}`).catch(() => null);
    }
  }
}

export function registerCounters(client) {
  client.on('ready', async () => {
    for (const g of client.guilds.cache.values()) {
      await updateGuildCounters(client, g);
    }
  });

  client.on('guildMemberAdd', async (member) => {
    await updateGuildCounters(client, member.guild);
  });

  client.on('guildMemberRemove', async (member) => {
    await updateGuildCounters(client, member.guild);
  });
}

export function setCountersConfig(db, guildId, config) {
  const row = db.prepare('SELECT guild_id FROM counters_config WHERE guild_id = ?').get(guildId);
  if (!row) db.prepare('INSERT INTO counters_config (guild_id, enabled, member_channel_id, bot_channel_id) VALUES (?, ?, ?, ?)').run(guildId, config.enabled ? 1 : 0, config.memberChannelId || null, config.botChannelId || null);
  else db.prepare('UPDATE counters_config SET enabled = ?, member_channel_id = ?, bot_channel_id = ? WHERE guild_id = ?').run(config.enabled ? 1 : 0, config.memberChannelId || null, config.botChannelId || null, guildId);
}
