export default {
  name: 'join',
  description: 'Définir message et salon de bienvenue: join <channelId> <message...>',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const channelId = args[0];
    const text = args.slice(1).join(' ');
    try {
      const exists = client.db.prepare('SELECT 1 FROM guild_config WHERE guild_id = ?').get(message.guildId);
      if (!exists) client.db.prepare('INSERT INTO guild_config (guild_id, join_channel_id, join_message) VALUES (?, ?, ?)').run(message.guildId, channelId || null, text || null);
      else client.db.prepare('UPDATE guild_config SET join_channel_id = ?, join_message = ? WHERE guild_id = ?').run(channelId || null, text || null, message.guildId);
      await message.channel.send('Configuration de bienvenue mise à jour.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre à jour la configuration de join.");
    }
  }
};
