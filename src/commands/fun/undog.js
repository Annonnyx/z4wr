export default {
  name: 'undog',
  description: 'Retirer la laisse à un membre (retire rôle Dog)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!member) return message.channel.send('Mentionne un membre ou fournis son ID.');
    try {
      const role = message.guild.roles.cache.find((r) => r.name === 'Dog');
      if (role) await member.roles.remove(role).catch(() => null);
      await message.channel.send(`${member.user.tag} retiré de la laisse.`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de retirer la laisse.");
    }
  }
};
