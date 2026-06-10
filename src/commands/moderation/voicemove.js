export default {
  name: 'voicemove',
  description: 'Déplacer un membre vers un canal vocal',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const target = args[1] ? message.guild.channels.cache.get(args[1]) : null;
    if (!member || !target) return message.channel.send('Usage: voicemove <user> <voiceChannelId>');
    try {
      await member.voice.setChannel(target);
      await message.channel.send(`${member.user.tag} déplacé.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `VOICEMOVE: ${member.user.tag} (${member.id}) -> ${target.id} par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de déplacer le membre.");
    }
  }
};
