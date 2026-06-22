const db = require('../database/db');
const guildService = require('./guildService');

function getMaxBases(guildId) {
  const value = guildService.getServerConfig(guildId, 'max_bases');
  return value ? parseInt(value, 10) : 5;
}

function getPlayerBases(guildId, userId) {
  return db.prepare('SELECT * FROM player_bases WHERE guild_id = ? AND user_id = ? ORDER BY is_main DESC, name').all(guildId, userId);
}

function getGuildBases(guildId) {
  return db.prepare(`
    SELECT b.*, p.ingame_name, p.discord_id
    FROM player_bases b
    JOIN players p ON b.guild_id = p.guild_id AND b.user_id = p.user_id
    WHERE b.guild_id = ?
    ORDER BY b.is_main DESC, b.name
  `).all(guildId);
}

function getBaseById(id, guildId) {
  return db.prepare('SELECT * FROM player_bases WHERE id = ? AND guild_id = ?').get(id, guildId);
}

function addBase(guildId, userId, { name, x, y, z, description, is_main }) {
  const existing = getPlayerBases(guildId, userId);
  const maxBases = getMaxBases(guildId);
  if (existing.length >= maxBases) {
    throw new Error(`Maximale Anzahl an Basen pro User erreicht (${maxBases}).`);
  }
  const mainFlag = is_main ? 1 : (existing.length === 0 ? 1 : 0);

  if (mainFlag) {
    db.prepare('UPDATE player_bases SET is_main = 0 WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  }

  const result = db.prepare(`
    INSERT INTO player_bases (guild_id, user_id, name, x, y, z, description, is_main)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, name, x, y, z || null, description || null, mainFlag);
  return result.lastInsertRowid;
}

function updateBase(id, guildId, userId, { name, x, y, z, description, is_main }) {
  const base = getBaseById(id, guildId);
  if (!base) return false;
  if (userId && base.user_id !== userId) return false;

  const mainFlag = is_main ? 1 : base.is_main;
  if (mainFlag) {
    db.prepare('UPDATE player_bases SET is_main = 0 WHERE guild_id = ? AND user_id = ?').run(guildId, base.user_id);
  }

  db.prepare(`
    UPDATE player_bases
    SET name = ?, x = ?, y = ?, z = ?, description = ?, is_main = ?
    WHERE id = ?
  `).run(
    name || base.name,
    x !== undefined ? x : base.x,
    y !== undefined ? y : base.y,
    z !== undefined ? z : base.z,
    description !== undefined ? description : base.description,
    mainFlag,
    id
  );
  return true;
}

function deleteBase(id, guildId, userId) {
  const base = getBaseById(id, guildId);
  if (!base) return false;
  if (userId && base.user_id !== userId) return false;
  db.prepare('DELETE FROM player_bases WHERE id = ?').run(id);
  return true;
}

function setMainBase(id, guildId, userId) {
  const base = getBaseById(id, guildId);
  if (!base || base.user_id !== userId) return false;
  db.prepare('UPDATE player_bases SET is_main = 0 WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  db.prepare('UPDATE player_bases SET is_main = 1 WHERE id = ?').run(id);
  return true;
}

module.exports = {
  getPlayerBases,
  getGuildBases,
  getBaseById,
  addBase,
  updateBase,
  deleteBase,
  setMainBase,
  getMaxBases,
};
