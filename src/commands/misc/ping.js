export default {
  name: 'ping',
  description: 'Répond avec la latence du bot',
  async execute({ client, message }) {
    const sent = await message.channel.send('Pong...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`Pong! Latence: ${latency}ms — API: ${Math.round(client.ws.ping)}ms`);
  }
};
