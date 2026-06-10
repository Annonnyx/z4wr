export function registerJoin(client) {
  client.on('guildMemberAdd', async (member) => {
    const row = client.db.prepare('SELECT join_channel_id, join_message FROM guild_config WHERE guild_id = ?').get(member.guild.id);
    if (!row?.join_channel_id) return;
    const channel = await member.guild.channels.fetch(row.join_channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const msg = (row.join_message || 'Bienvenue {user} sur {server}!')
      .replaceAll('{user}', `<@${member.user.id}>`)
      .replaceAll('{username}', member.user.username)
      .replaceAll('{server}', member.guild.name);

    await channel.send({ content: msg }).catch(() => null);
  });
}
