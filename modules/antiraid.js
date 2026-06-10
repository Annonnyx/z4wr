import { PermissionsBitField } from 'discord.js';

function ensureRow(db, guildId) {
  const row = db.prepare('SELECT guild_id FROM antiraid_config WHERE guild_id = ?').get(guildId);
  if (!row) db.prepare('INSERT INTO antiraid_config (guild_id) VALUES (?)').run(guildId);
}

function hasInviteOrOauthLink(content) {
  const c = content.toLowerCase();
  if (c.includes('discord.gg/')) return true;
  if (c.includes('discord.com/invite/')) return true;
  if (c.includes('discordapp.com/invite/')) return true;
  if (c.includes('discord.com/oauth2/authorize')) return true;
  if (c.includes('discordapp.com/oauth2/authorize')) return true;
  return false;
}

function hasLink(content) {
  const re = /(https?:\/\/|www\.)\S+/i;
  return re.test(content);
}

export function registerAntiRaid(client) {
  client.on('guildMemberAdd', async (member) => {
    const row = client.db.prepare('SELECT antibot FROM antiraid_config WHERE guild_id = ?').get(member.guild.id);
    if (!row?.antibot) return;
    if (!member.user.bot) return;
    try {
      if (member.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await member.ban({ reason: 'Antibot activé' });
      } else {
        await member.kick('Antibot activé');
      }
    } catch {
    }
  });

  client.on('messageCreate', async (message) => {
    if (!message.guildId) return;
    if (!message.content) return;
    if (message.author?.bot) return;

    const row = client.db.prepare('SELECT antilink, antibot, antiping, badwords, badwords_list FROM antiraid_config WHERE guild_id = ?').get(message.guildId);
    if (!row) return;

    const isStaff = message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages) || message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    if (row.antilink && !isStaff && hasLink(message.content)) {
      try {
        await message.delete();
      } catch {
      }
      return;
    }

    if (row.antibot && !isStaff && hasInviteOrOauthLink(message.content)) {
      try {
        await message.delete();
      } catch {
      }
      return;
    }

    if (row.badwords && !isStaff) {
      const list = (row.badwords_list || '').split(',').map((s) => s.trim()).filter(Boolean);
      const c = message.content.toLowerCase();
      if (list.some((w) => w && c.includes(w.toLowerCase()))) {
        try {
          await message.delete();
        } catch {
        }
        return;
      }
    }

    if (row.antiping && !isStaff) {
      if ((message.mentions?.everyone || message.mentions?.roles?.size > 0) && message.member) {
        try {
          await message.member.timeout(10 * 60 * 1000, 'Antiping activé');
        } catch {
        }
        try {
          await message.delete();
        } catch {
        }
      }
    }
  });
}

export function setAntiRaidToggle(db, guildId, key, value) {
  ensureRow(db, guildId);
  db.prepare(`UPDATE antiraid_config SET ${key} = ? WHERE guild_id = ?`).run(value ? 1 : 0, guildId);
}

export function setBadWords(db, guildId, words) {
  ensureRow(db, guildId);
  db.prepare('UPDATE antiraid_config SET badwords = 1, badwords_list = ? WHERE guild_id = ?').run(words.join(','), guildId);
}

export function clearBadWords(db, guildId) {
  ensureRow(db, guildId);
  db.prepare('UPDATE antiraid_config SET badwords = 0, badwords_list = NULL WHERE guild_id = ?').run(guildId);
}
