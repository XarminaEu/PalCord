const db = require('../database/db');
const guildService = require('./guildService');
const rconCommands = require('../rcon/commands');
const restClient = require('../rest/client');
const logger = require('../logger');

function getScheduledBroadcasts(guildId) {
  return db.prepare('SELECT * FROM scheduled_broadcasts WHERE guild_id = ? ORDER BY run_at').all(guildId);
}

function addScheduledBroadcast(guildId, message, runAt, { recurring = 0, time = null } = {}) {
  const result = db.prepare('INSERT INTO scheduled_broadcasts (guild_id, message, run_at, recurring, time) VALUES (?, ?, ?, ?, ?)').run(guildId, message, runAt, recurring ? 1 : 0, time);
  return result.lastInsertRowid;
}

function deleteScheduledBroadcast(id, guildId) {
  const result = db.prepare('DELETE FROM scheduled_broadcasts WHERE id = ? AND guild_id = ?').run(id, guildId);
  return result.changes > 0;
}

function getPendingBroadcasts() {
  const now = new Date().toISOString();
  return db.prepare('SELECT * FROM scheduled_broadcasts WHERE recurring = 0 AND run_at <= ? AND sent = 0').all(now);
}

function getRecurringBroadcasts() {
  return db.prepare('SELECT * FROM scheduled_broadcasts WHERE recurring = 1').all();
}

function markSent(id) {
  db.prepare('UPDATE scheduled_broadcasts SET sent = 1 WHERE id = ?').run(id);
}

function markRecurringRun(id, date) {
  db.prepare('UPDATE scheduled_broadcasts SET last_run_at = ? WHERE id = ?').run(date.toISOString(), id);
}

async function sendBroadcastToServer(guildId, message) {
  const server = guildService.getActiveServer(guildId);
  if (!server) {
    logger.warn(`No active server for guild ${guildId}, cannot send broadcast`);
    return { success: false, error: 'No active server' };
  }
  if (server.rest_api_host && server.rest_api_port) {
    return restClient.announce(server, message);
  }
  return rconCommands.broadcast(server, message);
}

async function processScheduledBroadcasts() {
  const pending = getPendingBroadcasts();
  for (const broadcast of pending) {
    try {
      const result = await sendBroadcastToServer(broadcast.guild_id, broadcast.message);
      if (result.success) {
        markSent(broadcast.id);
        logger.info(`Scheduled broadcast sent for guild ${broadcast.guild_id}: ${broadcast.message}`);
      } else {
        logger.error(`Failed to send scheduled broadcast for guild ${broadcast.guild_id}: ${result.error}`);
      }
    } catch (err) {
      logger.error(`Error sending scheduled broadcast ${broadcast.id}: ${err.message}`);
    }
  }

  const recurring = getRecurringBroadcasts();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];
  for (const broadcast of recurring) {
    if (!broadcast.time) continue;
    const lastRun = broadcast.last_run_at ? broadcast.last_run_at.split('T')[0] : null;
    if (broadcast.time === currentTime && lastRun !== today) {
      try {
        const result = await sendBroadcastToServer(broadcast.guild_id, broadcast.message);
        if (result.success) {
          markRecurringRun(broadcast.id, now);
          logger.info(`Recurring broadcast sent for guild ${broadcast.guild_id}: ${broadcast.message}`);
        } else {
          logger.error(`Failed to send recurring broadcast for guild ${broadcast.guild_id}: ${result.error}`);
        }
      } catch (err) {
        logger.error(`Error sending recurring broadcast ${broadcast.id}: ${err.message}`);
      }
    }
  }
}

function startScheduler() {
  setInterval(processScheduledBroadcasts, 60000);
  processScheduledBroadcasts();
  logger.info('Scheduled broadcast scheduler started');
}

module.exports = {
  getScheduledBroadcasts,
  addScheduledBroadcast,
  deleteScheduledBroadcast,
  getPendingBroadcasts,
  markSent,
  sendBroadcastToServer,
  processScheduledBroadcasts,
  startScheduler,
};
