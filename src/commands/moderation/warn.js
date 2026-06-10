export default {
  name: 'warn',
  description: 'Avertir un membre',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const member = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!member) return message.channel.send('Mentionne un membre ou fournis son ID.');
    const reason = args.slice(1).join(' ') || null;
    try {
      client.db.prepare('INSERT INTO warns (guild_id, user_id, reason, mod_id, created_at) VALUES (?, ?, ?, ?, ?)').run(message.guildId, member.id, reason, message.author.id, Date.now());
      await message.channel.send(`${member.tag} averti. ${reason ? `Raison: ${reason}` : ''}`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `WARN: ${member.tag} (${member.id}) par ${message.author.tag} — ${reason || 'no reason'}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'avertir ce membre.");
    }
  }
};
