const db = require('./db');
const logger = require('../logger');

function addColumnIfNotExists(table, column, type) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    logger.info(`Added column ${column} to ${table}`);
  }
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'misc'
    );

    CREATE TABLE IF NOT EXISTS pals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_boss INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      asset TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guild_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      rcon_host TEXT NOT NULL,
      rcon_port INTEGER NOT NULL,
      rcon_password TEXT NOT NULL,
      server_ip TEXT NOT NULL,
      max_players INTEGER DEFAULT 32,
      description TEXT,
      info_url TEXT,
      emblem_url TEXT,
      embed_channel_id TEXT,
      embed_message_id TEXT,
      update_interval_ms INTEGER DEFAULT 60000,
      starting_coins INTEGER DEFAULT 0,
      coins_per_hour INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guild_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      discord_id TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_global_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(guild_id, discord_id)
    );

    CREATE TABLE IF NOT EXISTS players (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      player_uid TEXT,
      discord_id TEXT,
      ingame_name TEXT,
      level INTEGER DEFAULT 1,
      coins INTEGER DEFAULT 0,
      total_playtime INTEGER DEFAULT 0,
      last_seen TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      price INTEGER NOT NULL,
      amount INTEGER DEFAULT 1,
      level INTEGER,
      egg_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      shop_item_id INTEGER,
      coins_before INTEGER,
      coins_after INTEGER,
      rcon_command TEXT,
      rcon_response TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS server_config (
      guild_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (guild_id, key)
    );
  `);

  addColumnIfNotExists('guild_servers', 'rest_api_host', 'TEXT');
  addColumnIfNotExists('guild_servers', 'rest_api_port', 'INTEGER DEFAULT 8212');
  addColumnIfNotExists('guild_servers', 'rest_api_username', 'TEXT DEFAULT \'admin\'');
  addColumnIfNotExists('players', 'platform', 'TEXT DEFAULT \'unknown\'');
  addColumnIfNotExists('guilds', 'language', 'TEXT DEFAULT \'de\'');

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_bases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL,
      description TEXT,
      is_main INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id, user_id) REFERENCES players(guild_id, user_id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_player_bases_guild_user ON player_bases (guild_id, user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      message TEXT NOT NULL,
      run_at TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      recurring INTEGER DEFAULT 0,
      time TEXT,
      last_run_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_guild_run ON scheduled_broadcasts (guild_id, run_at, sent);
  `);

  try {
    db.exec(`ALTER TABLE scheduled_broadcasts ADD COLUMN recurring INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE scheduled_broadcasts ADD COLUMN time TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE scheduled_broadcasts ADD COLUMN last_run_at TEXT;`);
  } catch (e) {}

  try {
    const rows = db.prepare("SELECT user_id, guild_id FROM players WHERE user_id GLOB '?????????????????' AND LENGTH(user_id) >= 17").all();
    for (const row of rows) {
      const normalized = `steam_${row.user_id}`;
      const existing = db.prepare('SELECT 1 FROM players WHERE user_id = ? AND guild_id = ?').get(normalized, row.guild_id);
      if (existing) {
        db.prepare('DELETE FROM players WHERE user_id = ? AND guild_id = ?').run(row.user_id, row.guild_id);
      } else {
        db.prepare('UPDATE players SET user_id = ? WHERE user_id = ? AND guild_id = ?').run(normalized, row.user_id, row.guild_id);
      }
    }
  } catch (e) {
    logger.error(`Player normalization migration failed: ${e.message}`);
  }

  try {
    db.prepare("UPDATE players SET platform = 'steam' WHERE user_id LIKE 'steam_%' AND (platform IS NULL OR platform = '' OR platform = 'unknown')").run();
  } catch (e) {
    logger.error(`Platform migration failed: ${e.message}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS copyright_banned_keys (
      api_key TEXT PRIMARY KEY,
      reason TEXT,
      banned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      banned_by TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS copyright_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key TEXT NOT NULL,
      program TEXT,
      copyright TEXT,
      ip TEXT,
      allowed INTEGER DEFAULT 0,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_copyright_logs_key ON copyright_logs (api_key);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners_count INTEGER DEFAULT 1,
      end_time TEXT NOT NULL,
      participants TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      channel_id TEXT,
      message_id TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_giveaways_guild_status ON giveaways (guild_id, status);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER NOT NULL,
      winner_id TEXT NOT NULL,
      channel_id TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_giveaway_tickets_giveaway ON giveaway_tickets (giveaway_id);
  `);

  logger.info('Database initialized successfully.');
}

module.exports = { init };
