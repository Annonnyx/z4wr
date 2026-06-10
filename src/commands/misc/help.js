export default {
  name: 'help',
  description: 'Liste les commandes disponibles',
  async execute({ client, message }) {
    const lines = Array.from(client.commands.values()).map((c) => `\`${c.name}\` - ${c.description ?? ''}`);
    const reply = lines.length ? lines.join('\n') : 'Aucune commande trouvée.';
    await message.channel.send(`Commandes disponibles:\n${reply}`);
  }
};
