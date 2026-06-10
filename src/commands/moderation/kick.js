import { PermissionsBitField } from 'discord.js';

export default {
  name: 'kick',
  description: 'Expulser un membre du serveur',
  guildOnly: true,
  userPerm: PermissionsBitField.Flags.KickMembers,
  async execute({ client, message, args }) {
    if (!message.guild) return;
    const targetArg = args[0];
    let member = message.mentions.members?.first() || null;
    if (!member && targetArg) {
      member = await message.guild.members.fetch(targetArg).catch(() => null);
    }

    if (!member) {
      await message.channel.send('Utilisateur introuvable. Mentionne-le ou fournis son ID.');
      return;
    }

    const reason = args.slice(1).join(' ') || 'Aucun motif fourni';
    try {
      await member.kick(reason);
      await message.channel.send(`Expulsé ${member.user.tag} — ${reason}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible d'expulser cet utilisateur.");
    }
  }
};
