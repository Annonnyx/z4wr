import { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';

export default {
  name: 'help',
  description: 'Liste les commandes disponibles',
  async execute({ client, message }) {
    const cmds = Array.from(client.commands.values());
    if (!cmds.length) return message.channel.send('Aucune commande trouvée.');

    const categories = Array.from(new Set(cmds.map((c) => c.category || 'misc'))).sort();
    const options = [{ label: 'All', value: 'all', description: 'Toutes les commandes' }].concat(
      categories.map((cat) => ({ label: cat, value: cat, description: `${cat} commands` }))
    );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`help_select_${message.author.id}_${Date.now()}`)
        .setPlaceholder('Choisissez une catégorie')
        .addOptions(options)
        .setMaxValues(1)
    );

    const prompt = await message.channel.send({ content: 'Sélectionnez une catégorie pour afficher ses commandes:', components: [row] });

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = prompt.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const sel = interaction.values[0];
      let lines = [];
      if (sel === 'all') {
        lines = cmds.map((c) => `\`${c.name}\` - ${c.description ?? ''}`);
      } else {
        lines = cmds.filter((c) => (c.category || 'misc') === sel).map((c) => `\`${c.name}\` - ${c.description ?? ''}`);
      }

      if (!lines.length) {
        await interaction.followUp({ content: 'Aucune commande trouvée pour cette catégorie.', ephemeral: true });
        return;
      }

      const header = `Commandes: ${sel}\n`;
      const max = 1900;
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

      // remove components from visible prompt
      try { await prompt.edit({ components: [] }); } catch {}

      // send the command list ephemerally to the user to avoid long public messages
      await interaction.followUp({ content: header + chunks[0], ephemeral: true });
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: true });
      }
    });

    collector.on('end', () => {
      try { prompt.edit({ components: [] }).catch(() => {}); } catch {}
    });
  }
};
