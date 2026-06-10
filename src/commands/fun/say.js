export default {
  name: 'say',
  description: 'Faire dire quelque chose au bot',
  async execute({ client, message, args }) {
    const text = args.join(' ');
    if (!text) return message.channel.send('Fournis un texte.');
    await message.channel.send(text);
  }
};
