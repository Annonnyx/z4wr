import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Partials, Collection, PermissionsBitField } from 'discord.js';
import { initDb } from './lib/db.js';
import { loadCommands } from './lib/loader.js';
import { handleMessage } from './lib/messageHandler.js';
import { registerSniper } from './lib/sniper.js';
import { registerAntiRaid } from './modules/antiraid.js';
import { registerJoin } from './modules/join.js';
import { registerCounters } from './modules/counters.js';
import { registerTicketInteractions } from './modules/tickets.js';
import { registerSetupMenu } from './modules/setupMenu.js';
import { registerHelpMenu } from './modules/helpMenu.js';
import { keepAlive } from './keepAlive.js';

function loadEnv() {
  const envRoot = path.resolve(process.cwd(), '.env');
  const envSrc = path.resolve(process.cwd(), 'src', '.env');
  const candidates = [envRoot, envSrc];

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
console.log('[BOOT] init db...');
client.db = initDb();
console.log('[BOOT] db ready');
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
