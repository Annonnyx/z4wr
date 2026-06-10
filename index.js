import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Partials, Collection, PermissionsBitField } from 'discord.js';

function loadEnv() {
  const envRoot = path.resolve(process.cwd(), '.env');
  const envSrc = path.resolve(process.cwd(), 'src', '.env');
  const envCfg = path.resolve(process.cwd(), 'cfg', '.env');
  const candidates = [envRoot, envSrc, envCfg];

  const extractToken = (raw) => {
    if (!raw) return null;
    const cleaned = raw.replace(/^\uFEFF/, '');
    const line = cleaned.match(/^\s*DISCORD_TOKEN\s*=\s*(.+)\s*$/m);
    if (!line) return null;
    let value = (line[1] || '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value || null;
  };

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;

    dotenv.config({ path: p });

    try {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = dotenv.parse(raw);
      const normalizedKeys = [];
      for (const [k, v] of Object.entries(parsed)) {
        const nk = k.replace(/^\uFEFF/, '').trim();
        normalizedKeys.push(nk);
        if (process.env[nk] == null) process.env[nk] = v;
      }

      if (!process.env.DISCORD_TOKEN) {
        const token = extractToken(raw);
        if (token) process.env.DISCORD_TOKEN = token;
      }

      return { path: p, parsedKeys: normalizedKeys };
    } catch {
      return { path: p, parsedKeys: [] };
    }
  }

  return { path: null, parsedKeys: [] };
}

const envInfo = loadEnv();

console.log(`[BOOT] env loaded from: ${envInfo.path ?? 'none'}`);

const debug = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

if (!process.env.DISCORD_TOKEN) {
  const hasKey = envInfo.parsedKeys.includes('DISCORD_TOKEN');
  throw new Error(
    `Missing DISCORD_TOKEN in environment. Loaded env path: ${envInfo.path ?? 'none'} | DISCORD_TOKEN key present in file: ${hasKey}`
  );
}

console.log('[BOOT] token present: yes');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.isOwner = (userId) => {
  // Hardcoded owner for emergency access
  if (userId === '1122092101459517481') return true;
  
  const row = client.db.prepare('SELECT user_id FROM owners WHERE user_id = ?').get(userId);
  return !!row;
};
client.getPrefix = (guildId) => {
  if (!guildId) return '!';
  const row = client.db.prepare('SELECT prefix FROM guild_config WHERE guild_id = ?').get(guildId);
  return row?.prefix ?? '!';
};
client.requirePerm = (member, perm) => {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return member.permissions.has(perm);
};

client.debug = debug;
client.logDebug = (...args) => {
  if (client.debug) console.log('[DEBUG]', ...args);
};
console.log('[BOOT] loading commands...');
import { fileURLToPath } from 'node:url';
const __file = fileURLToPath(import.meta.url);
const __dir = path.dirname(__file);

async function tryImport(candidates) {
  for (const p of candidates) {
    try {
      const full = new URL(p, import.meta.url).href;
      const fsPath = fileURLToPath(full);
      if (!fs.existsSync(fsPath)) continue;
      return await import(full);
    } catch (e) {
      // continue trying
    }
  }
  throw new Error(`Module not found in candidates: ${candidates.join(', ')}`);
}

const dbMod = await tryImport(['./src/lib/db.js', './lib/db.js', './NoCostCord/src/lib/db.js', '../src/lib/db.js']);
const loaderMod = await tryImport(['./src/lib/loader.js', './lib/loader.js', './NoCostCord/src/lib/loader.js', '../src/lib/loader.js']);
const msgMod = await tryImport(['./src/lib/messageHandler.js', './lib/messageHandler.js', './NoCostCord/src/lib/messageHandler.js', '../src/lib/messageHandler.js']);
const sniperMod = await tryImport(['./src/lib/sniper.js', './lib/sniper.js', './NoCostCord/src/lib/sniper.js', '../src/lib/sniper.js']);
const antiraidMod = await tryImport(['./src/modules/antiraid.js', './modules/antiraid.js', './NoCostCord/src/modules/antiraid.js', '../src/modules/antiraid.js']);
const joinMod = await tryImport(['./src/modules/join.js', './modules/join.js', './NoCostCord/src/modules/join.js', '../src/modules/join.js']);
const countersMod = await tryImport(['./src/modules/counters.js', './modules/counters.js', './NoCostCord/src/modules/counters.js', '../src/modules/counters.js']);
const ticketsMod = await tryImport(['./src/modules/tickets.js', './modules/tickets.js', './NoCostCord/src/modules/tickets.js', '../src/modules/tickets.js']);
const setupMod = await tryImport(['./src/modules/setupMenu.js', './modules/setupMenu.js', './NoCostCord/src/modules/setupMenu.js', '../src/modules/setupMenu.js']);
const helpMod = await tryImport(['./src/modules/helpMenu.js', './modules/helpMenu.js', './NoCostCord/src/modules/helpMenu.js', '../src/modules/helpMenu.js']);
const keepAliveMod = await tryImport(['./keepAlive.js', './NoCostCord/keepAlive.js', '../keepAlive.js']);

const { initDb } = dbMod;
const { loadCommands } = loaderMod;
const { handleMessage } = msgMod;
const { registerSniper } = sniperMod;
const { registerAntiRaid } = antiraidMod;
const { registerJoin } = joinMod;
const { registerCounters } = countersMod;
const { registerTicketInteractions } = ticketsMod;
const { registerSetupMenu } = setupMod;
const { registerHelpMenu } = helpMod;
const { keepAlive } = keepAliveMod;

console.log('[BOOT] init db...');
client.db = initDb();
console.log('[BOOT] db ready');
await loadCommands(client);
console.log('[BOOT] registering modules...');
registerSniper(client);
registerAntiRaid(client);
registerJoin(client);
registerCounters(client);
registerTicketInteractions(client);
registerSetupMenu(client);
registerHelpMenu(client);

console.log('[BOOT] attaching message handler...');

// Remove existing listeners to prevent duplicates
client.removeAllListeners('messageCreate');
client.on('messageCreate', (message) => handleMessage(client, message));

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'discord.gg/EpzmYztycM', type: 0 }],
    status: 'online'
  });
});

keepAlive();
await client.login(process.env.DISCORD_TOKEN);
