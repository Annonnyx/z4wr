import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'dmall',
  description: 'Envoyer un DM à tous les membres du serveur (owner only) — confirmation requise',
  guildOnly: true,
  ownerOnly: true,
  async execute({ client, message, args }) {
    const text = args.join(' ');
    if (!text) return message.channel.send('Fournis un message à envoyer.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dm_confirm_yes').setLabel('Oui').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dm_confirm_no').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );

    const confirm = await message.channel.send({ content: `Confirmer l'envoi de ce DM à tous les membres?\n\n${text}`, components: [row] });

    try {
      const interaction = await confirm.awaitMessageComponent({ time: 30000, filter: (i) => i.user.id === message.author.id });
      await interaction.deferUpdate();
      if (interaction.customId === 'dm_confirm_no') {
        await confirm.edit({ content: 'Envoi annulé.', components: [] });
        return;
      }

      await confirm.edit({ content: 'Envoi des DMs en cours...', components: [] });
      const members = await message.guild.members.fetch();
      let sent = 0;
      for (const [, m] of members) {
        try {
          await m.send(text).catch(() => null);
          sent++;
        } catch {}
      }
      await message.channel.send(`DMs envoyés à ${sent} membres (tentative).`);
    } catch {
      await confirm.edit({ content: 'Temps écoulé — annulation.', components: [] }).catch(() => null);
    }
  }
};
