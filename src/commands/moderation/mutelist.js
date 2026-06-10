export default {
  name: 'mutelist',
  description: 'Liste des membres mute (base de données)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message }) {
    try {
      const rows = client.db.prepare('SELECT user_id, mod_id, created_at FROM mutes WHERE guild_id = ?').all(message.guildId);
      if (!rows.length) return message.channel.send('Aucun membre mute.');
      const lines = await Promise.all(rows.map(async (r) => {
        const u = await client.users.fetch(r.user_id).catch(() => ({ id: r.user_id, tag: r.user_id }));
        return `${u.tag ?? u.id} (${r.user_id})`;
      }));
      await message.channel.send(`Mutes:\n${lines.join('\n')}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de récupérer la liste des mutes.");
    }
  }
};
