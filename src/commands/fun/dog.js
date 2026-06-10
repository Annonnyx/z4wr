export default {
  name: 'dog',
  description: 'Mettre un membre en laisse (ajoute rôle Dog)',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const member = message.mentions.members?.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!member) return message.channel.send('Mentionne un membre ou fournis son ID.');
    try {
      let role = message.guild.roles.cache.find((r) => r.name === 'Dog');
      if (!role) role = await message.guild.roles.create({ name: 'Dog', permissions: [] });
      await member.roles.add(role);
      await message.channel.send(`${member.user.tag} est maintenant en laisse.`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'ajouter la laisse.");
    }
  }
};
