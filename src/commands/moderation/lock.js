export default {
  name: 'lock',
  description: 'Verrouiller le salon courant',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message }) {
    if (!message.guild || !message.channel) return;
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      await message.channel.send('Salon verrouillé.');
      await (await import('../../lib/utils.js')).modLog(client, message.guildId, `LOCK: #${message.channel.name} par ${message.author.tag}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de verrouiller le salon.");
    }
  }
};
