export default {
  name: 'clear',
  description: 'Supprimer plusieurs messages (max 100)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const count = parseInt(args[0], 10);
    if (!count || count < 1 || count > 100) {
      await message.channel.send('Usage: clear <nombre 1-100>');
      return;
    }

    try {
      const deleted = await message.channel.bulkDelete(count, true);
      await message.channel.send(`Supprimé ${deleted.size} messages.`).then((m) => setTimeout(() => m.delete().catch(() => null), 3000));
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de supprimer les messages.");
    }
  }
};
