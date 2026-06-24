const db = require('../database/db');
const logger = require('../logger');

function getGiveaways(guildId) {
  return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
}

function getActiveGiveaways(guildId) {
  return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND status = ? ORDER BY end_time').all(guildId, 'active');
}

function getGiveawayById(id) {
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(id);
}

function createGiveaway(guildId, { prize, winnersCount, endTime, channelId, createdBy }) {
  const result = db.prepare(
    'INSERT INTO giveaways (guild_id, prize, winners_count, end_time, channel_id, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(guildId, prize, winnersCount, endTime, channelId, createdBy);
  return result.lastInsertRowid;
}

function deleteGiveaway(id, guildId) {
  const result = db.prepare('DELETE FROM giveaways WHERE id = ? AND guild_id = ?').run(id, guildId);
  return result.changes > 0;
}

function updateGiveawayMessage(id, messageId) {
  db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(messageId, id);
}

function getParticipants(giveaway) {
  try {
    return JSON.parse(giveaway.participants || '[]');
  } catch (e) {
    return [];
  }
}

function addParticipant(giveawayId, userId) {
  const giveaway = getGiveawayById(giveawayId);
  if (!giveaway) return false;
  const participants = getParticipants(giveaway);
  if (participants.includes(userId)) return false;
  participants.push(userId);
  db.prepare('UPDATE giveaways SET participants = ? WHERE id = ?').run(JSON.stringify(participants), giveawayId);
  return true;
}

function removeParticipant(giveawayId, userId) {
  const giveaway = getGiveawayById(giveawayId);
  if (!giveaway) return false;
  const participants = getParticipants(giveaway).filter(id => id !== userId);
  db.prepare('UPDATE giveaways SET participants = ? WHERE id = ?').run(JSON.stringify(participants), giveawayId);
  return true;
}

function setStatus(giveawayId, status) {
  db.prepare('UPDATE giveaways SET status = ? WHERE id = ?').run(status, giveawayId);
}

function getPendingEndGiveaways() {
  const now = new Date().toISOString();
  return db.prepare('SELECT * FROM giveaways WHERE status = ? AND end_time <= ?').all('active', now);
}

function getTickets(giveawayId) {
  return db.prepare('SELECT * FROM giveaway_tickets WHERE giveaway_id = ?').all(giveawayId);
}

function getTicketById(id) {
  return db.prepare('SELECT * FROM giveaway_tickets WHERE id = ?').get(id);
}

function createTicket(giveawayId, winnerId, channelId) {
  const result = db.prepare(
    'INSERT INTO giveaway_tickets (giveaway_id, winner_id, channel_id) VALUES (?, ?, ?)'
  ).run(giveawayId, winnerId, channelId);
  return result.lastInsertRowid;
}

function setTicketStatus(id, status) {
  db.prepare('UPDATE giveaway_tickets SET status = ? WHERE id = ?').run(status, id);
}

function drawWinners(giveawayId) {
  const giveaway = getGiveawayById(giveawayId);
  if (!giveaway) return [];
  const participants = getParticipants(giveaway);
  if (participants.length === 0) return [];
  const count = Math.min(giveaway.winners_count, participants.length);
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

module.exports = {
  getGiveaways,
  getActiveGiveaways,
  getGiveawayById,
  createGiveaway,
  deleteGiveaway,
  updateGiveawayMessage,
  getParticipants,
  addParticipant,
  removeParticipant,
  setStatus,
  getPendingEndGiveaways,
  drawWinners,
  getTickets,
  getTicketById,
  createTicket,
  setTicketStatus,
};
