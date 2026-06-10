export default {
  name: 'addrole',
  description: 'Ajouter un rôle à un membre',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const roleArg = message.mentions.roles?.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);
    if (!member || !roleArg) return message.channel.send('Usage: addrole <user> <roleId|@role>');
    try {
      await member.roles.add(roleArg);
      await message.channel.send(`Rôle ajouté à ${member.user.tag}`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `ADDROLE: ${roleArg.id || roleArg.name} à ${member.user.tag} par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'ajouter le rôle.");
    }
  }
};
