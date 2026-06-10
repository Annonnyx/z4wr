export default {
  name: 'unmute',
  description: 'Retirer le mute d\'un membre',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!member) return message.channel.send('Mentionne un membre ou fournis son ID.');
    try {
      const role = message.guild.roles.cache.find((r) => r.name === 'Muted');
      if (role) await member.roles.remove(role).catch(() => null);
      client.db.prepare('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?').run(message.guildId, member.id);
      await message.channel.send(`${member.user.tag} est maintenant unmute.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `UNMUTE: ${member.user.tag} (${member.id}) par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de unmute ce membre.");
    }
  }
};
