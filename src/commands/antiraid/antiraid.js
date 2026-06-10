import { setAntiRaidToggle, setBadWords, clearBadWords } from '../../modules/antiraid.js';

export default {
  name: 'antiraid',
  description: 'Configurer les protections antiraid (toggle): antilink|antibot|antiping|badwords',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const key = args[0];
    if (!key) return message.channel.send('Usage: antiraid <antilink|antibot|antiping|badwords> [on|off|add|clear|list]');

    if (key === 'badwords') {
      const action = args[1];
      if (!action) return message.channel.send('badwords <add|clear|list> [words]');
      if (action === 'add') {
        const words = args.slice(2).join(' ').split(',').map((s) => s.trim()).filter(Boolean);
        if (!words.length) return message.channel.send('Fournis une liste de mots séparés par des virgules.');
        setBadWords(client.db, message.guildId, words);
        await message.channel.send(`Mots interdits enregistrés: ${words.join(', ')}`);
        return;
      }
      if (action === 'clear') {
        clearBadWords(client.db, message.guildId);
        await message.channel.send('Liste de badwords effacée.');
        return;
      }
      if (action === 'list') {
        const row = client.db.prepare('SELECT badwords_list FROM antiraid_config WHERE guild_id = ?').get(message.guildId);
        const list = (row?.badwords_list || '').split(',').map((s) => s.trim()).filter(Boolean);
        return message.channel.send(list.length ? `Badwords: ${list.join(', ')}` : 'Aucun badword configuré.');
      }
      return message.channel.send('Action badwords non supportée.');
    }

    const val = (args[1] || 'toggle').toLowerCase();
    const allowed = ['antilink', 'antibot', 'antiping'];
    if (!allowed.includes(key)) return message.channel.send('Option non supportée.');
    const setVal = val === 'on' ? 1 : val === 'off' ? 0 : null;
    try {
      if (setVal === null) {
        // toggle current
        const row = client.db.prepare('SELECT ' + key + ' FROM antiraid_config WHERE guild_id = ?').get(message.guildId) || {};
        const cur = row[key] || 0;
        setAntiRaidToggle(client.db, message.guildId, key, cur ? 0 : 1);
        await message.channel.send(`${key} -> ${cur ? 'OFF' : 'ON'}`);
      } else {
        setAntiRaidToggle(client.db, message.guildId, key, setVal === 1);
        await message.channel.send(`${key} -> ${setVal ? 'ON' : 'OFF'}`);
      }
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mettre à jour l'antiraid.");
    }
  }
};
