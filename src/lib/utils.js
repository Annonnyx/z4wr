import { PermissionsBitField } from 'discord.js';

export function parseUserId(input) {
  if (!input) return null;
  const m = input.match(/^(?:<@!?)?(\d{15,25})(?:>)?$/);
  return m ? m[1] : null;
}

export function formatDuration(ms) {
  if (ms == null) return null;
  const sec = Math.floor(ms / 1000);
  const s = sec % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  const d = Math.floor(sec / 86400);
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(' ');
}

export function parseDuration(input) {
  if (!input) return null;
  const str = input.toLowerCase();
  const re = /(\d+)\s*(d|j|h|m|s)/g;
  let match;
  let total = 0;
  while ((match = re.exec(str))) {
    const n = Number(match[1]);
    const unit = match[2];
    if (unit === 'd' || unit === 'j') total += n * 86400000;
    if (unit === 'h') total += n * 3600000;
    if (unit === 'm') total += n * 60000;
    if (unit === 's') total += n * 1000;
  }
  return total > 0 ? total : null;
}

export function isHigherOrEqual(member, target) {
  if (!member || !target) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.roles.highest.comparePositionTo(target.roles.highest) >= 0;
}

export async function modLog(client, guildId, text) {
  try {
    const cols = client.db.prepare("PRAGMA table_info('guild_config')").all().map((c) => c.name);
    if (!cols.includes('mod_log_channel_id')) {
      client.db.exec("ALTER TABLE guild_config ADD COLUMN mod_log_channel_id TEXT");
    }

    const row = client.db.prepare('SELECT mod_log_channel_id FROM guild_config WHERE guild_id = ?').get(guildId);
    const chId = row?.mod_log_channel_id || null;
    if (!chId) {
      console.log('[MODLOG]', text);
      return;
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;
    const ch = guild.channels.cache.get(chId) || await guild.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.isTextBased?.()) return;
    await ch.send(text);
  } catch (e) {
    console.error('modLog error', e);
  }
}
