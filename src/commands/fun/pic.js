export default {
  name: 'pic',
  description: 'Afficher une image aléatoire (picsum)',
  async execute({ client, message }) {
    const url = `https://picsum.photos/600/300?${Date.now()}`;
    await message.channel.send(url);
  }
};
