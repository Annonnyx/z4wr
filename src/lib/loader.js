import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function loadCommands(client) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const commandsDir = path.resolve(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  const stats = { total: 0, categories: {} };

  for (const cat of categories) {
    const catDir = path.join(commandsDir, cat.name);
    const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.js'));

    stats.categories[cat.name] = 0;
    for (const file of files) {
      const full = path.join(catDir, file);
      const mod = await import(full);
      const cmd = mod.default;
      if (!cmd?.name || !cmd?.execute) continue;
      // attach category for help grouping
      if (!cmd.category) cmd.category = cat.name;
      // If the command doesn't provide an interactive UI, create a basic one adapted by category
      if (typeof cmd.interactive !== 'function') {
        cmd.interactive = makeInteractiveFor(cmd);
      }
      client.commands.set(cmd.name, cmd);
      stats.total += 1;
      stats.categories[cat.name] += 1;
    }
  }

  console.log('Commands loaded:', stats.total);
  for (const [cat, count] of Object.entries(stats.categories)) {
    console.log(` - ${cat}: ${count}`);
  }

  return stats;
}

function makeInteractiveFor(cmd) {
  return async function interactive({ client, message, args, prefix }) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const ask = async (prompt, opts = {}) => {
      const time = opts.time || 30000;
      const cancelBtn = new ButtonBuilder().setCustomId(`cancel_${message.author.id}_${Date.now()}`).setLabel('Annuler').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(cancelBtn);

      const promptMsg = await message.channel.send({ content: prompt, components: [row] });

      const textPromise = message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time }).then((col) => col.first()?.content?.trim() ?? null);

      const buttonPromise = new Promise((resolve) => {
        const collector = promptMsg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time, max: 1 });
        collector.on('collect', async (interaction) => {
          try { await interaction.reply({ content: 'Annulé.', ephemeral: true }); } catch {}
          resolve('__CANCELLED__');
        });
        collector.on('end', () => resolve(null));
      });

      const result = await Promise.race([textPromise, buttonPromise]);
      try { await promptMsg.edit({ components: [] }).catch(() => {}); } catch {}
      if (result === '__CANCELLED__' || result == null) return null;
      return result;
    };

    const confirm = async (prompt, opts = {}) => {
      const time = opts.time || 20000;
      const yes = new ButtonBuilder().setCustomId(`yes_${message.author.id}_${Date.now()}`).setLabel('Oui').setStyle(ButtonStyle.Success);
      const no = new ButtonBuilder().setCustomId(`no_${message.author.id}_${Date.now()}`).setLabel('Non').setStyle(ButtonStyle.Secondary);
      const row = new ActionRowBuilder().addComponents(yes, no);
      const m = await message.channel.send({ content: prompt, components: [row] });
      try {
        const inter = await m.awaitMessageComponent({ filter: (i) => i.user.id === message.author.id, time });
        await inter.deferUpdate().catch(() => {});
        await m.edit({ components: [] }).catch(() => {});
        return inter.customId.startsWith('yes_');
      } catch (e) {
        try { await m.edit({ components: [] }).catch(() => {}); } catch {}
        return false;
      }
    };

    try {
      // Moderation commands: ask for target and reason, then confirm
      if (cmd.category === 'moderation') {
        const targetRaw = await ask('Veuillez mentionner la cible ou indiquer son ID:');
        if (!targetRaw) return message.channel.send('Temps écoulé ou annulé.');
        const match = targetRaw.match(/<@!?(\d+)>/) || targetRaw.match(/^(\d+)$/);
        const targetId = match ? match[1] : null;
        if (!targetId) return message.channel.send('Cible invalide.');
        const reason = await ask('Raison (optionnel):');

        // confirmation via buttons
        const ok = await confirm(`Confirmer l'exécution de \`${cmd.name} ${targetId} ${reason || ''}\` ?`);
        if (!ok) return message.channel.send('Annulé.');
        const newArgs = [targetId].concat(reason ? reason.split(/\s+/g) : []);
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Fun commands: ask for content
      if (cmd.category === 'fun') {
        const text = await ask('Texte ou entrée pour la commande:');
        if (!text) return message.channel.send('Temps écoulé ou annulé.');
        const newArgs = text.split(/\s+/g);
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Owner commands: ask for args and require confirmation
      if (cmd.category === 'owner') {
        const text = await ask('Arguments (séparés par espaces):');
        if (text === null) return message.channel.send('Temps écoulé ou annulé.');
        const ok = await confirm(`Exécuter \`${cmd.name} ${text}\` ?`);
        if (!ok) return message.channel.send('Annulé.');
        const newArgs = text.length ? text.split(/\s+/g) : [];
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Config/ticket/antiraid: ask for sub-arguments or show usage
      if (['config', 'ticket', 'antiraid'].includes(cmd.category)) {
        const text = await ask(`Entrez les arguments pour ${cmd.name} ou tapez \`help\` pour voir l'utilisation:`);
        if (!text) return message.channel.send('Temps écoulé ou annulé.');
        if (/^help$/i.test(text)) return message.channel.send(cmd.usage || cmd.description || 'Aucune info.');
        const newArgs = text.length ? text.split(/\s+/g) : [];
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Fallback: show usage/description and ask for args
      const text = await ask(`Usage: ${cmd.usage || ''}\n${cmd.description || ''}\nEntrez les arguments:`);
      if (!text) return message.channel.send('Temps écoulé ou annulé.');
      const newArgs = text.length ? text.split(/\s+/g) : [];
      return cmd.execute({ client, message, args: newArgs, prefix });
    } catch (e) {
      console.error('[INTERACTIVE_FACTORY_ERR]', e);
      try { await message.channel.send('Erreur lors de l\'interaction.'); } catch {}
    }
  };
}
