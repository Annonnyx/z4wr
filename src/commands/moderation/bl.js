export default {
  name: 'bl',
  description: 'Ajouter un membre à la blacklist',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) return message.channel.send('Mentionne un utilisateur ou fournis son ID.');
    const reason = args.slice(1).join(' ') || null;
    try {
      client.db.prepare('INSERT OR REPLACE INTO blacklist (user_id, reason, added_by, added_at) VALUES (?, ?, ?, ?)').run(target.id, reason, message.author.id, Date.now());
      await message.channel.send(`${target.tag} ajouté à la blacklist.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `BLACKLIST_ADD: ${target.tag} (${target.id}) par ${message.author.tag} — ${reason || 'no reason'}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'ajouter à la blacklist.");
    }
  }
};
