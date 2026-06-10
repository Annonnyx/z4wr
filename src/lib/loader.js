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
    const ask = async (prompt, opts = {}) => {
      await message.channel.send(prompt);
      const collected = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: opts.time || 30000 });
      return collected.first()?.content?.trim() ?? null;
    };

    try {
      // Moderation commands: ask for target and reason, then confirm
      if (cmd.category === 'moderation') {
        const targetRaw = await ask('Veuillez mentionner la cible ou indiquer son ID:');
        if (!targetRaw) return message.channel.send('Temps écoulé.');
        const match = targetRaw.match(/<@!?(\d+)>/) || targetRaw.match(/^(\d+)$/);
        const targetId = match ? match[1] : null;
        if (!targetId) return message.channel.send('Cible invalide.');
        const reason = await ask('Raison (optionnel):');

        // confirmation
        await message.channel.send(`Confirmer l'exécution de \\`${cmd.name} ${targetId} ${reason || ''}\\` ? (oui/non)`);
        const conf = await ask('Tapez `oui` pour confirmer, autre pour annuler:', { time: 20000 });
        if (!conf || !/^o/i.test(conf)) return message.channel.send('Annulé.');
        const newArgs = [targetId].concat(reason ? reason.split(/\s+/g) : []);
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Fun commands: ask for content
      if (cmd.category === 'fun') {
        const text = await ask('Texte ou entrée pour la commande:');
        if (!text) return message.channel.send('Temps écoulé.');
        const newArgs = text.split(/\s+/g);
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Owner commands: ask for args and require confirmation
      if (cmd.category === 'owner') {
        const text = await ask('Arguments (séparés par espaces):');
        if (text === null) return message.channel.send('Temps écoulé.');
        await message.channel.send(`Exécuter \\`${cmd.name} ${text}\\` ? (oui/non)`);
        const conf = await ask('Tapez `oui` pour confirmer:', { time: 20000 });
        if (!conf || !/^o/i.test(conf)) return message.channel.send('Annulé.');
        const newArgs = text.length ? text.split(/\s+/g) : [];
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Config/ticket/antiraid: ask for sub-arguments or show usage
      if (['config', 'ticket', 'antiraid'].includes(cmd.category)) {
        const text = await ask(`Entrez les arguments pour ${cmd.name} ou tapez \`help\` pour voir l'utilisation:`);
        if (!text) return message.channel.send('Temps écoulé.');
        if (/^help$/i.test(text)) return message.channel.send(cmd.usage || cmd.description || 'Aucune info.');
        const newArgs = text.length ? text.split(/\s+/g) : [];
        return cmd.execute({ client, message, args: newArgs, prefix });
      }

      // Fallback: show usage/description and ask for args
      const text = await ask(`Usage: ${cmd.usage || ''}\n${cmd.description || ''}\nEntrez les arguments:`);
      if (!text) return message.channel.send('Temps écoulé.');
      const newArgs = text.length ? text.split(/\s+/g) : [];
      return cmd.execute({ client, message, args: newArgs, prefix });
    } catch (e) {
      console.error('[INTERACTIVE_FACTORY_ERR]', e);
      try { await message.channel.send('Erreur lors de l\'interaction.'); } catch {}
    }
  };
}
