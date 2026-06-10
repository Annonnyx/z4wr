export default {
  name: 'mp',
  description: 'Envoyer un MP à un membre (usage: mp @user texte)',
  async execute({ client, message, args }) {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const text = args.slice(message.mentions.users.size ? 1 : 1).join(' ') || args.slice(1).join(' ');
    if (!user || !text) return message.channel.send('Usage: mp <user> <message>');
    try {
      await user.send(text);
      await message.channel.send('MP envoyé.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'envoyer le MP.");
    }
  }
};
