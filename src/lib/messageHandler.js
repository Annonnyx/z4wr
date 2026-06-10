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

  try {
    await cmd.execute({ client, message, args, prefix });
  } catch (e) {
    console.error(`[CMD_ERR] ${name}`, e);
    await safeReply(message, 'Erreur lors de lexécution de la commande.');
  }
}
