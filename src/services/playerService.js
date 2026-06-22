const db = require('../database/db');
const restClient = require('../rest/client');
const rconCommands = require('../rcon/commands');
const logger = require('../logger');

function parseShowPlayers(response) {
  if (!response || !response.success) return [];
  const lines = response.response.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const players = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      const userId = normalizeUserId(parts[2].trim());
      players.push({
        name: parts[0].trim(),
        playerUid: parts[1].trim(),
        userId,
        steamId: userId,
        platform: detectPlatform(userId),
      });
    } else if (parts.length >= 2) {
      players.push({
        name: parts[0].trim(),
        playerUid: parts[1].trim(),
        userId: '',
        steamId: '',
        platform: 'unknown',
      });
    }
  }
  return players;
}

function syncPlayers(guildId, onlinePlayers, server) {
  const now = new Date().toISOString();
  const baseCoinsPerMinute = server.coins_per_hour / 60;
  const linkedBonus = server.linked_coins_bonus || 0.5;
  const upsert = db.prepare(`
    INSERT INTO players (user_id, guild_id, player_uid, ingame_name, platform, level, last_seen, total_playtime, coins)
    VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT total_playtime FROM players WHERE user_id = ? AND guild_id = ?), 0) + 1, COALESCE((SELECT coins FROM players WHERE user_id = ? AND guild_id = ?), 0) + ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET
      player_uid = excluded.player_uid,
      ingame_name = excluded.ingame_name,
      platform = excluded.platform,
      level = excluded.level,
      last_seen = excluded.last_seen,
      total_playtime = players.total_playtime + 1,
      coins = players.coins + ?
  `);

  const transaction = db.transaction((players) => {
    for (const player of players) {
      const userId = normalizeUserId(player.userId || player.steamId || player.playerUid);
      if (!userId) continue;
      const existing = db.prepare('SELECT discord_id FROM players WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
      const isLinked = !!(existing && existing.discord_id);
      const coinsPerMinute = baseCoinsPerMinute * (isLinked ? 1 + linkedBonus : 1);
      upsert.run(userId, guildId, player.playerUid, player.name, player.platform || detectPlatform(userId) || 'unknown', player.level || 1, now, userId, guildId, userId, guildId, coinsPerMinute, coinsPerMinute);
    }
  });

  transaction(onlinePlayers);
  logger.info(`Synced ${onlinePlayers.length} online players for guild ${guildId}.`);
}

function detectPlatform(userId) {
  if (!userId) return 'unknown';
  if (userId.startsWith('steam_')) return 'steam';
  if (/^\d{17,}$/.test(userId)) return 'steam';
  if (userId.startsWith('xbox_')) return 'xbox';
  if (userId.startsWith('ps5_') || userId.startsWith('ps4_')) return 'playstation';
  if (userId.startsWith('mac_')) return 'mac';
  if (userId.startsWith('windows_')) return 'windows';
  if (userId.startsWith('switch_')) return 'switch';
  return 'unknown';
}

function normalizeUserId(userId) {
  if (!userId) return userId;
  const trimmed = userId.trim();
  if (/^\d{17,}$/.test(trimmed)) return `steam_${trimmed}`;
  return trimmed;
}

function parseRestPlayers(response) {
  if (!response || !response.success || !response.data) return [];
  const players = response.data.players || response.data;
  if (!Array.isArray(players)) return [];
  return players.map(p => {
    const userId = normalizeUserId(p.userId);
    return {
      name: p.name,
      playerUid: p.playerId,
      userId,
      steamId: userId,
      platform: detectPlatform(userId),
      level: p.level || 1,
      ip: p.ip,
      ping: p.ping,
      location: p.location,
    };
  });
}

async function getOnlinePlayers(server) {
  const result = await restClient.getPlayers(server);
  let players = parseRestPlayers(result);
  if (players.length === 0 && result && !result.success) {
    logger.warn(`REST API players failed, falling back to RCON for ${server.server_ip}`);
    const rconResult = await rconCommands.showPlayers(server);
    players = parseShowPlayers(rconResult);
  }
  return players;
}

function getPlayers(guildId) {
  return db.prepare('SELECT * FROM players WHERE guild_id = ? ORDER BY ingame_name ASC').all(guildId);
}

function getPlayerById(guildId, userId) {
  return db.prepare('SELECT * FROM players WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function addCoins(guildId, userId, amount) {
  const stmt = db.prepare('UPDATE players SET coins = coins + ? WHERE guild_id = ? AND user_id = ?');
  const result = stmt.run(amount, guildId, userId);
  return result.changes > 0;
}

function getCoins(guildId, userId) {
  const row = db.prepare('SELECT coins FROM players WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  return row ? row.coins : 0;
}

function setCoins(guildId, userId, amount) {
  const stmt = db.prepare('UPDATE players SET coins = ? WHERE guild_id = ? AND user_id = ?');
  const result = stmt.run(amount, guildId, userId);
  return result.changes > 0;
}

function formatPlaytime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

module.exports = {
  parseShowPlayers,
  syncPlayers,
  getOnlinePlayers,
  getPlayers,
  getPlayerById,
  addCoins,
  getCoins,
  setCoins,
  formatPlaytime,
  normalizeUserId,
  detectPlatform,
};
