import { PermissionsBitField } from 'discord.js';

async function safeReply(message, content) {
  try {
    await message.channel.send(content);
  } catch {}
}

export async function handleMessage(client, message) {
  console.log(`[DEBUG] handleMessage called for message ${message.id} from ${message.author?.id} | webhook: ${message.webhookId} | bot: ${message.author?.bot}`);
  // dedupe: avoid handling the same message twice in this process
  try {
    if (!client._recentMessages) client._recentMessages = new Map();
    if (client._recentMessages.has(message.id)) return;
    client._recentMessages.set(message.id, Date.now());
    setTimeout(() => client._recentMessages.delete(message.id), 5000);
  } catch (e) {
    // ignore dedupe errors
  }
  if (!message || message.author?.bot || message.webhookId) return;

  if (message.guildId) {
    const bl = client.db.prepare('SELECT user_id FROM blacklist WHERE user_id = ?').get(message.author.id);
    if (bl) return;
  }

  const prefix = client.getPrefix(message.guildId);
  if (!message.content?.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/g);
  const name = (args.shift() || '').toLowerCase();
  if (!name) return;

  const cmd = client.commands.get(name);
  if (!cmd) return;

  console.log(
    `[CMD] ${name} | user=${message.author.id} | guild=${message.guildId ?? 'DM'} | channel=${message.channelId}`
  );

  if (cmd.guildOnly && !message.guild) {
    await safeReply(message, 'Cette commande est utilisable uniquement sur un serveur.');
    return;
  }

  if (cmd.ownerOnly) {
    const isOwner = client.isOwner(message.author.id);
    if (!isOwner) {
      await safeReply(message, 'Commande réservée aux owners du bot.');
      return;
    }
  }

  if (cmd.userPerm && message.member) {
    const ok = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || message.member.permissions.has(cmd.userPerm);
    if (!ok) {
      await safeReply(message, "Tu n'as pas la permission pour cette commande.");
      return;
    }
  }

  // If command defines an interactive UI and no args were provided, call it.
  try {
    if ((!args || args.length === 0) && typeof cmd.interactive === 'function') {
      await cmd.interactive({ client, message, args, prefix });
      return;
    }

    // Generic interactive UI fallback: when no args and no custom interactive, show a small menu
    if ((!args || args.length === 0) && typeof cmd.interactive !== 'function') {
      try {
        const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = await import('discord.js');
        const options = [
          { label: 'Usage', value: 'usage', description: 'Voir l\'utilisation de la commande' },
          { label: 'Description', value: 'desc', description: 'Voir la description de la commande' },
          { label: 'Entrer des arguments', value: 'enter', description: 'Fournir des arguments pour exécuter la commande' }
        ];

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`cmd_ui_${cmd.name}_${message.author.id}_${Date.now()}`)
            .setPlaceholder('Choisis une action')
            .addOptions(options)
            .setMaxValues(1)
        );

        const prompt = await message.channel.send({ content: `Interface pour \\`${cmd.name}\\``, components: [row] });
        const filter = (i) => i.user.id === message.author.id;
        const collector = prompt.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async (interaction) => {
          await interaction.deferUpdate();
          const sel = interaction.values[0];
          if (sel === 'usage') {
            const usage = cmd.usage || 'Pas d\'utilisation documentée.';
            await interaction.followUp({ content: `Usage: ${usage}`, ephemeral: true });
          } else if (sel === 'desc') {
            await interaction.followUp({ content: `Description: ${cmd.description || 'Aucune description.'}`, ephemeral: true });
          } else if (sel === 'enter') {
            await interaction.followUp({ content: 'Réponds avec la ligne d\'arguments (séparés par espaces).', ephemeral: true });
            const collected = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: 30000 });
            const reply = collected.first();
            if (!reply) return interaction.followUp({ content: 'Temps écoulé.', ephemeral: true });
            const text = reply.content.trim();
            const newArgs = text.length ? text.split(/\s+/g) : [];
            try {
              await cmd.execute({ client, message, args: newArgs, prefix });
            } catch (e) {
              console.error('[CMD_EXEC_ERR]', e);
              await message.channel.send('Erreur lors de l\'exécution de la commande.');
            }
          }
          collector.stop();
        });

        collector.on('end', () => { try { prompt.edit({ components: [] }).catch(()=>{}); } catch {} });
        return;
      } catch (uiErr) {
        console.error('[GEN_UI_ERR]', uiErr);
      }
    }
  } catch (e) {
    console.error('[INTERACTIVE_ERR]', e);
    await safeReply(message, "Erreur lors de l'ouverture de l'interface.");
    return;
  }

  try {
    await cmd.execute({ client, message, args, prefix });
  } catch (e) {
    console.error(`[CMD_ERR] ${name}`, e);
    await safeReply(message, 'Erreur lors de lexécution de la commande.');
  }
}
