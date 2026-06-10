import { PermissionsBitField } from 'discord.js';
import { modLog } from '../../lib/utils.js';

export default {
  name: 'ban',
  description: 'Bannir un membre du serveur',
  guildOnly: true,
  userPerm: PermissionsBitField.Flags.BanMembers,
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
      await member.ban({ reason });
      await message.channel.send(`Banni ${member.user.tag} — ${reason}`);
      await modLog(client, message.guildId, `BAN: ${member.user.tag} (${member.id}) par ${message.author.tag} — ${reason}`);
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de bannir cet utilisateur.");
    }
  }
};
