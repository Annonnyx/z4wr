export default {
  name: 'banlist',
  description: 'Liste les membres bannis du serveur',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message }) {
    if (!message.guild) return;
    try {
      const bans = await message.guild.bans.fetch();
      if (!bans.size) return message.channel.send('Aucun membre banni.');
      const lines = bans.map((b) => `${b.user.tag} (${b.user.id})`).slice(0, 50);
      await message.channel.send(`Banns:\n${lines.join('\n')}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de récupérer la liste des bans.");
    }
  }
};
