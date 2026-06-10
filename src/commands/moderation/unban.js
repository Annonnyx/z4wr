export default {
  name: 'unban',
  description: 'Retirer le ban d\'un membre',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const id = args[0];
    if (!id) return message.channel.send('Fournis l\'ID de l\'utilisateur à unban.');
    try {
      await message.guild.bans.remove(id);
      await message.channel.send(`Utilisateur ${id} débanni.`);
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `UNBAN: ${id} par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de débannir cet utilisateur.");
    }
  }
};
