import { setAntiRaidToggle, setBadWords, clearBadWords } from '../../modules/antiraid.js';

export default {
  name: 'antiraid',
  description: 'Configurer les protections antiraid (toggle): antilink|antibot|antiping|badwords',
  guildOnly: true,
  userPerm: 0,
  async interactive({ client, message }) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = await import('discord.js');

    const options = [
      { label: 'antilink', value: 'antilink' },
      { label: 'antibot', value: 'antibot' },
      { label: 'antiping', value: 'antiping' },
      { label: 'badwords', value: 'badwords' }
    ];

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`antiraid_sel_${message.author.id}_${Date.now()}`).setPlaceholder('Choisis une option').addOptions(options.map(o=>({label:o.label,value:o.value})))
    );

    const prompt = await message.channel.send({ content: 'Antiraid — sélectionne une option:', components: [menu] });
    const filter = (i) => i.user.id === message.author.id;
    const collector = prompt.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const sel = interaction.values[0];
      if (sel === 'badwords') {
        // show secondary menu: add|clear|list
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`antiraid_bad_${message.author.id}_${Date.now()}`).setPlaceholder('Badwords action').addOptions([
            { label: 'Add', value: 'add' },
            { label: 'Clear', value: 'clear' },
            { label: 'List', value: 'list' }
          ])
        );
        try { await prompt.edit({ content: 'Badwords — action:', components: [row] }); } catch {}
        const badCollector = prompt.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000 });
        badCollector.on('collect', async (bi) => {
          await bi.deferUpdate();
          const act = bi.values[0];
          if (act === 'list') {
            const row = client.db.prepare('SELECT badwords_list FROM antiraid_config WHERE guild_id = ?').get(message.guildId);
            const list = (row?.badwords_list || '').split(',').map(s=>s.trim()).filter(Boolean);
            await message.channel.send(list.length ? `Badwords: ${list.join(', ')}` : 'Aucun badword configuré.');
          } else if (act === 'clear') {
            clearBadWords(client.db, message.guildId);
            await message.channel.send('Liste de badwords effacée.');
          } else if (act === 'add') {
            await message.channel.send('Réponds avec la liste de mots séparés par des virgules.');
            const reply = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: 30000 });
            const txt = reply.first()?.content || '';
            const words = txt.split(',').map(s=>s.trim()).filter(Boolean);
            if (!words.length) return message.channel.send('Aucun mot fourni.');
            setBadWords(client.db, message.guildId, words);
            await message.channel.send(`Mots interdits enregistrés: ${words.join(', ')}`);
          }
          badCollector.stop();
          collector.stop();
        });
        return;
      }

      // toggle selected boolean keys
      try {
        const row = client.db.prepare('SELECT ' + sel + ' FROM antiraid_config WHERE guild_id = ?').get(message.guildId) || {};
        const cur = row[sel] || 0;
        setAntiRaidToggle(client.db, message.guildId, sel, cur ? 0 : 1);
        await message.channel.send(`${sel} -> ${cur ? 'OFF' : 'ON'}`);
      } catch (e) {
        console.error(e);
        await message.channel.send("Impossible de mettre à jour l'antiraid.");
      }

      collector.stop();
    });

    collector.on('end', () => {
      try { prompt.edit({ components: [] }).catch(()=>{}); } catch {}
    });
  },
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
