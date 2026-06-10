export default {
  name: 'blacklist',
  description: 'Afficher les utilisateurs en blacklist',
  guildOnly: false,
  userPerm: 0,
  async execute({ client, message }) {
    try {
      const rows = client.db.prepare('SELECT user_id, reason, added_by, added_at FROM blacklist').all();
      if (!rows.length) return message.channel.send('Blacklist vide.');
      const lines = await Promise.all(rows.map(async (r) => {
        const u = await client.users.fetch(r.user_id).catch(() => ({ id: r.user_id, tag: r.user_id }));
        return `${u.tag ?? r.user_id} — ${r.reason ?? 'no reason'}`;
      }));
      await message.channel.send(lines.join('\n'));
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de récupérer la blacklist.");
    }
  }
};
