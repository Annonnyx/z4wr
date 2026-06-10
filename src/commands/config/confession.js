export default {
  name: 'confession',
  description: 'Définir le salon de confession pour le serveur',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const ch = args[0] || null;
    try {
      const exists = client.db.prepare('SELECT 1 FROM guild_config WHERE guild_id = ?').get(message.guildId);
      if (exists) client.db.prepare('UPDATE guild_config SET confession_channel_id = ? WHERE guild_id = ?').run(ch, message.guildId);
      else client.db.prepare('INSERT INTO guild_config (guild_id, confession_channel_id) VALUES (?, ?)').run(message.guildId, ch);
      await message.channel.send('Confession channel updated.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre à jour la configuration.");
    }
  }
};
