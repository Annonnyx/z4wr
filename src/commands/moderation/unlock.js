export default {
  name: 'unlock',
  description: 'Déverrouiller le salon courant',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message }) {
    if (!message.guild || !message.channel) return;
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
      await message.channel.send('Salon déverrouillé.');
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `UNLOCK: #${message.channel.name} par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de déverrouiller le salon.");
    }
  }
};
