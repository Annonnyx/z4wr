import {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder
} from 'discord.js';

async function cleanup(message, msg) {
  try {
    await msg.delete();
  } catch {
  }
  try {
    if (message.deletable) await message.delete();
  } catch {
  }
}

export async function promptUser({ message, title = 'Choisis un membre', timeMs = 60000 }) {
  const menu = new UserSelectMenuBuilder().setCustomId('sel_user').setPlaceholder(title).setMinValues(1).setMaxValues(1);
  const row = new ActionRowBuilder().addComponents(menu);
  const msg = await message.channel.send({ content: title, components: [row] });

  try {
    const interaction = await msg.awaitMessageComponent({
      time: timeMs,
      filter: (i) => i.user.id === message.author.id
    });

    const userId = interaction.values?.[0] || null;
    await interaction.deferUpdate();
    await msg.edit({ content: 'OK', components: [] }).catch(() => null);
    setTimeout(() => msg.delete().catch(() => null), 1500);
    return userId;
  } catch {
    await cleanup(message, msg);
    return null;
  }
}

export async function promptRole({ message, title = 'Choisis un rôle', timeMs = 60000 }) {
  const menu = new RoleSelectMenuBuilder().setCustomId('sel_role').setPlaceholder(title).setMinValues(1).setMaxValues(1);
  const row = new ActionRowBuilder().addComponents(menu);
  const msg = await message.channel.send({ content: title, components: [row] });

  try {
    const interaction = await msg.awaitMessageComponent({
      time: timeMs,
      filter: (i) => i.user.id === message.author.id
    });

    const roleId = interaction.values?.[0] || null;
    await interaction.deferUpdate();
    await msg.edit({ content: 'OK', components: [] }).catch(() => null);
    setTimeout(() => msg.delete().catch(() => null), 1500);
    return roleId;
  } catch {
    await cleanup(message, msg);
    return null;
  }
}

export async function promptChannel({
  message,
  title = 'Choisis un salon',
  types = [ChannelType.GuildText],
  timeMs = 60000
}) {
  const menu = new ChannelSelectMenuBuilder()
    .setCustomId('sel_channel')
    .setPlaceholder(title)
    .setMinValues(1)
    .setMaxValues(1)
    .setChannelTypes(...types);

  const row = new ActionRowBuilder().addComponents(menu);
  const msg = await message.channel.send({ content: title, components: [row] });

  try {
    const interaction = await msg.awaitMessageComponent({
      time: timeMs,
      filter: (i) => i.user.id === message.author.id
    });

    const channelId = interaction.values?.[0] || null;
    await interaction.deferUpdate();
    await msg.edit({ content: 'OK', components: [] }).catch(() => null);
    setTimeout(() => msg.delete().catch(() => null), 1500);
    return channelId;
  } catch {
    await cleanup(message, msg);
    return null;
  }
}
