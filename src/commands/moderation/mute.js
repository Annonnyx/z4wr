import { modLog } from '../../lib/utils.js';

export default {
  name: 'mute',
  description: 'Mute un membre (assigne le rôle Muted)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!member) return message.channel.send('Mentionne un membre ou fournis son ID.');
    try {
      let role = message.guild.roles.cache.find((r) => r.name === 'Muted');
      if (!role) {
        role = await message.guild.roles.create({ name: 'Muted', permissions: [] });
        for (const [, ch] of message.guild.channels.cache) {
          try {
            await ch.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false, Speak: false });
          } catch {}
        }
      }
      await member.roles.add(role);
      client.db.prepare('INSERT OR REPLACE INTO mutes (guild_id, user_id, muted_until, mod_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(message.guildId, member.id, 0, message.author.id, args.slice(1).join(' ') || null, Date.now());
      await message.channel.send(`${member.user.tag} est maintenant mute.`);
      await modLog(client, message.guildId, `MUTE: ${member.user.tag} (${member.id}) par ${message.author.tag} — ${args.slice(1).join(' ') || 'no reason'}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de mute ce membre.");
    }
  }
};
