export default {
  name: 'counters',
  description: 'Configurer les counters (enable|disable|member|bot)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const action = args[0];
    const value = args[1] || null;
    try {
      const exists = client.db.prepare('SELECT 1 FROM counters_config WHERE guild_id = ?').get(message.guildId);
      if (!exists) client.db.prepare('INSERT INTO counters_config (guild_id) VALUES (?)').run(message.guildId);
      if (action === 'enable') client.db.prepare('UPDATE counters_config SET enabled = 1 WHERE guild_id = ?').run(message.guildId);
      else if (action === 'disable') client.db.prepare('UPDATE counters_config SET enabled = 0 WHERE guild_id = ?').run(message.guildId);
      else if (action === 'member') client.db.prepare('UPDATE counters_config SET member_channel_id = ? WHERE guild_id = ?').run(value, message.guildId);
      else if (action === 'bot') client.db.prepare('UPDATE counters_config SET bot_channel_id = ? WHERE guild_id = ?').run(value, message.guildId);
      else return message.channel.send('Usage: counters <enable|disable|member|bot> [value]');
      await message.channel.send('Counters updated.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre à jour les counters.");
    }
  }
};
