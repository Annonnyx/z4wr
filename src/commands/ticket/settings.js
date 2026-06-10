import { sendTicketPanel } from '../../modules/tickets.js';

export default {
  name: 'ticket',
  description: 'Gérer la configuration des tickets: settings subcommand',
  guildOnly: true,
  userPerm: 0,
  async execute({ client, message, args }) {
    const sub = args[0];
    if (!sub) return message.channel.send('Usage: ticket <settings|panel> ...');
    if (sub === 'panel') {
      const ch = args[1] || message.channelId;
      const ok = await sendTicketPanel(client, message.guild, ch).catch(() => false);
      return message.channel.send(ok ? 'Panel envoyé.' : 'Impossible d\'envoyer le panel.');
    }
    if (sub !== 'settings') return message.channel.send('Usage: ticket settings <enable|disable|panel|category|support|transcript> [value]');
    const action = args[1];
    const value = args[2];
    try {
      const exists = client.db.prepare('SELECT 1 FROM tickets_config WHERE guild_id = ?').get(message.guildId);
      if (!exists) client.db.prepare('INSERT INTO tickets_config (guild_id) VALUES (?)').run(message.guildId);
      if (action === 'enable') {
        client.db.prepare('UPDATE tickets_config SET enabled = ? WHERE guild_id = ?').run(value === 'on' || value === '1' ? 1 : 0, message.guildId);
        return message.channel.send('Tickets updated.');
      }
      if (['panel', 'category', 'support', 'transcript'].includes(action)) {
        const col = action === 'support' ? 'support_role_id' : action + '_channel_id';
        client.db.prepare(`UPDATE tickets_config SET ${col} = ? WHERE guild_id = ?`).run(value || null, message.guildId);
        return message.channel.send('Ticket setting saved.');
      }
      await message.channel.send('Option inconnue.');
    } catch (e) {
      console.error(e);
      await message.channel.send("Impossible de modifier la configuration des tickets.");
    }
  }
};
