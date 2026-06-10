const deletedMessages = new Map();

export function registerSniper(client) {
  client.on('messageDelete', async (message) => {
    if (!message?.guildId) return;
    if (!message.author || message.author.bot) return;
    deletedMessages.set(message.channelId, {
      content: message.content || null,
      authorId: message.author.id,
      createdAt: Date.now(),
      attachments: message.attachments?.map((a) => a.url) || []
    });
    setTimeout(() => {
      const cur = deletedMessages.get(message.channelId);
      if (cur?.createdAt && Date.now() - cur.createdAt > 300000) deletedMessages.delete(message.channelId);
    }, 300000);
  });

  client.sniper = {
    get(channelId) {
      return deletedMessages.get(channelId);
    }
  };
}
