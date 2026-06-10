export default {
  name: 'sniper',
  description: 'Récupérer le dernier message supprimé dans le salon',
  async execute({ client, message }) {
    const data = client.sniper.get(message.channelId);
    if (!data) return message.channel.send('Aucun message snipé récemment.');
    const author = await client.users.fetch(data.authorId).catch(() => null);
    await message.channel.send(`Auteur: ${author?.tag ?? data.authorId}\nContenu: ${data.content ?? '[pièce jointe]'}\nAttachments: ${data.attachments.join(', ')}`);
  }
};
