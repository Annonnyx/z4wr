export default {
  name: 'warnlist',
  description: 'Liste des warns pour le serveur',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message }) {
    try {
      const rows = client.db.prepare('SELECT user_id, warn_id, reason, mod_id, created_at FROM warns WHERE guild_id = ? ORDER BY created_at DESC LIMIT 200').all(message.guildId);
      if (!rows.length) return message.channel.send('Aucun warn.');
      const grouped = {};
      for (const r of rows) {
        grouped[r.user_id] = grouped[r.user_id] || [];
        grouped[r.user_id].push(r);
      }
      const lines = [];
      for (const [uid, arr] of Object.entries(grouped)) {
        const u = await client.users.fetch(uid).catch(() => ({ id: uid, tag: uid }));
        lines.push(`${u.tag ?? uid} — ${arr.length} warns`);
      }
      await message.channel.send(lines.join('\n'));
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de récupérer les warns.");
    }
  }
};
