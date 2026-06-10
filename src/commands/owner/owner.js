export default {
  name: 'owner',
  description: 'Ajouter un owner au bot',
  ownerOnly: true,
  async execute({ client, message, args }) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) return message.channel.send('Mentionne un utilisateur ou fournis son ID.');
    try {
      client.db.prepare('INSERT OR IGNORE INTO owners (user_id) VALUES (?)').run(target.id);
      await message.channel.send(`Ajouté ${target.tag} aux owners.`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'ajouter l'owner.");
    }
  }
};
