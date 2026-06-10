export default {
  name: 'help',
  description: 'Liste les commandes disponibles',
  async execute({ client, message }) {
    const lines = Array.from(client.commands.values()).map((c) => `\`${c.name}\` - ${c.description ?? ''}`);
    if (!lines.length) return message.channel.send('Aucune commande trouvée.');

    const header = 'Commandes disponibles:\n';
    const max = 1900; // keep under Discord 2000 limit
    const chunks = [];
    let cur = '';
    for (const line of lines) {
      if ((header.length + cur.length + line.length + 1) > max) {
        chunks.push(cur);
        cur = line + '\n';
      } else {
        cur += line + '\n';
      }
    }
    if (cur) chunks.push(cur);

    for (const [i, chunk] of chunks.entries()) {
      const prefix = i === 0 ? header : '';
      await message.channel.send(prefix + chunk);
    }
  }
};
