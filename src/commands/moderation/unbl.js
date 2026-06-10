export default {
  name: 'unbl',
  description: 'Retirer un membre de la blacklist',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) return message.channel.send('Mentionne un utilisateur ou fournis son ID.');
    try {
      client.db.prepare('DELETE FROM blacklist WHERE user_id = ?').run(target.id);
      await message.channel.send(`${target.tag} retiré de la blacklist.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `BLACKLIST_REMOVE: ${target.tag} (${target.id}) par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de retirer de la blacklist.");
    }
  }
};
