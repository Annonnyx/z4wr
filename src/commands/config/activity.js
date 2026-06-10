export default {
  name: 'activity',
  description: 'Définir l\'activité / bio du bot',
  guildOnly: false,
  ownerOnly: true,
  async execute({ client, message, args }) {
    const text = args.join(' ');
    if (!text) return message.channel.send('Fournis le texte de présence.');
    try {
      client.user.setPresence({ activities: [{ name: text }], status: 'online' });
      await message.channel.send('Présence mise à jour.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre la présence.");
    }
  }
};
