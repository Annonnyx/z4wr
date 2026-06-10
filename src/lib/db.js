import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function initDb() {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'bot.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS owners (
      user_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      user_id TEXT PRIMARY KEY,
      reason TEXT,
      added_by TEXT,
      added_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS warns (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      warn_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reason TEXT,
      mod_id TEXT,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_warns_guild_user ON warns (guild_id, user_id);

    CREATE TABLE IF NOT EXISTS mutes (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      muted_until INTEGER,
      mod_id TEXT,
      reason TEXT,
      created_at INTEGER,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT,
      activity TEXT,
      confession_channel_id TEXT,
      join_channel_id TEXT,
      join_message TEXT
    );

    CREATE TABLE IF NOT EXISTS antiraid_config (
      guild_id TEXT PRIMARY KEY,
      antilink INTEGER DEFAULT 0,
      antibot INTEGER DEFAULT 0,
      antiping INTEGER DEFAULT 0,
      badwords INTEGER DEFAULT 0,
      badwords_list TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      panel_channel_id TEXT,
      category_id TEXT,
      support_role_id TEXT,
      transcript_channel_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      guild_id TEXT NOT NULL,
      channel_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      created_at INTEGER,
      closed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS counters_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      member_channel_id TEXT,
      bot_channel_id TEXT
    );
  `);

  const guildCols = db.prepare("PRAGMA table_info('guild_config')").all().map((c) => c.name);
  if (!guildCols.includes('confession_channel_id')) {
    db.exec('ALTER TABLE guild_config ADD COLUMN confession_channel_id TEXT');
  }

  return db;
}
