export default {
  name: 'clearwarns',
  description: 'Supprimer tous les warns d\'un membre',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) return message.channel.send('Mentionne un membre ou fournis son ID.');
    try {
      client.db.prepare('DELETE FROM warns WHERE guild_id = ? AND user_id = ?').run(message.guildId, user.id);
      await message.channel.send(`Warns de ${user.tag} supprimés.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `CLEARWARNS: ${user.tag} (${user.id}) par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de supprimer les warns.");
    }
  }
};
