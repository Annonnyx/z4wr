export default {
  name: 'unowner',
  description: 'Retirer un owner du bot',
  ownerOnly: true,
  async execute({ client, message, args }) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) return message.channel.send('Mentionne un utilisateur ou fournis son ID.');
    try {
      client.db.prepare('DELETE FROM owners WHERE user_id = ?').run(target.id);
      await message.channel.send(`Retiré ${target.tag} des owners.`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de retirer l'owner.");
    }
  }
};
