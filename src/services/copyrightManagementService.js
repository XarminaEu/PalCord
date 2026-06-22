const db = require('../database/db');
const logger = require('../logger');

function isBanned(apiKey) {
  const row = db.prepare('SELECT * FROM copyright_banned_keys WHERE api_key = ?').get(apiKey);
  return row || null;
}

function banKey(apiKey, reason = 'API-Key gesperrt', bannedBy = null) {
  try {
    db.prepare('INSERT INTO copyright_banned_keys (api_key, reason, banned_by) VALUES (?, ?, ?)').run(apiKey, reason, bannedBy);
    return true;
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      db.prepare('UPDATE copyright_banned_keys SET reason = ?, banned_by = ?, banned_at = CURRENT_TIMESTAMP WHERE api_key = ?').run(reason, bannedBy, apiKey);
      return true;
    }
    logger.error(`Failed to ban key: ${err.message}`);
    return false;
  }
}

function unbanKey(apiKey) {
  const result = db.prepare('DELETE FROM copyright_banned_keys WHERE api_key = ?').run(apiKey);
  return result.changes > 0;
}

function getBannedKeys() {
  return db.prepare('SELECT * FROM copyright_banned_keys ORDER BY banned_at DESC').all();
}

function logCheck(apiKey, program, copyright, ip, allowed, reason = null) {
  try {
    db.prepare('INSERT INTO copyright_logs (api_key, program, copyright, ip, allowed, reason) VALUES (?, ?, ?, ?, ?, ?)').run(apiKey, program || '', copyright || '', ip || '', allowed ? 1 : 0, reason);
  } catch (err) {
    logger.error(`Failed to log copyright check: ${err.message}`);
  }
}

function getLogs(limit = 100, offset = 0) {
  return db.prepare('SELECT * FROM copyright_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

function countLogs() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM copyright_logs').get();
  return row ? row.count : 0;
}

module.exports = {
  isBanned,
  banKey,
  unbanKey,
  getBannedKeys,
  logCheck,
  getLogs,
  countLogs,
};
