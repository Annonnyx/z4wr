import { PermissionsBitField } from 'discord.js';

export default {
  name: 'prefix',
  description: 'Voir ou définir le préfix du serveur',
  guildOnly: true,
  userPerm: PermissionsBitField.Flags.ManageGuild,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const newPref = args[0];
    if (!newPref) {
      const row = client.db.prepare('SELECT prefix FROM guild_config WHERE guild_id = ?').get(message.guildId);
      const pref = row?.prefix ?? '!';
      await message.channel.send(`Préfix actuel: ${pref}`);
      return;
    }

    try {
      const exists = client.db.prepare('SELECT 1 FROM guild_config WHERE guild_id = ?').get(message.guildId);
      if (exists) {
        client.db.prepare('UPDATE guild_config SET prefix = ? WHERE guild_id = ?').run(newPref, message.guildId);
      } else {
        client.db.prepare('INSERT INTO guild_config (guild_id, prefix) VALUES (?, ?)').run(message.guildId, newPref);
      }
      await message.channel.send(`Préfix mis à jour: ${newPref}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre à jour le préfix.");
    }
  }
};
