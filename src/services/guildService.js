const db = require('../database/db');
const config = require('../config');

function isGlobalAdmin(discordId) {
  return discordId === config.globalAdminId;
}

function ensureGuild(guildId, name, ownerId) {
  const stmt = db.prepare('INSERT OR REPLACE INTO guilds (id, name, owner_id) VALUES (?, COALESCE((SELECT name FROM guilds WHERE id = ?), ?), COALESCE((SELECT owner_id FROM guilds WHERE id = ?), ?))');
  stmt.run(guildId, guildId, name || '', guildId, ownerId || '');
  if (ownerId) {
    ensureGuildUser(guildId, ownerId, 'admin');
  }
}

function getGuild(guildId) {
  return db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
}

function getGuildsForUser(discordId) {
  const owned = db.prepare('SELECT * FROM guilds WHERE owner_id = ?').all(discordId);
  const member = db.prepare('SELECT g.* FROM guilds g JOIN guild_users u ON g.id = u.guild_id WHERE u.discord_id = ?').all(discordId);
  const all = [...owned, ...member];
  const unique = all.filter((g, index, self) => self.findIndex(t => t.id === g.id) === index);
  return unique;
}

function ensureGuildUser(guildId, discordId, role = 'user') {
  const stmt = db.prepare('INSERT OR IGNORE INTO guild_users (guild_id, discord_id, role) VALUES (?, ?, ?)');
  stmt.run(guildId, discordId, role);
  if (isGlobalAdmin(discordId)) {
    db.prepare('UPDATE guild_users SET is_global_admin = 1 WHERE guild_id = ? AND discord_id = ?').run(guildId, discordId);
  }
}

function getGuildUser(guildId, discordId) {
  const user = db.prepare('SELECT * FROM guild_users WHERE guild_id = ? AND discord_id = ?').get(guildId, discordId);
  if (user) return user;
  if (isGlobalAdmin(discordId)) {
    return { guild_id: guildId, discord_id: discordId, role: 'admin', is_global_admin: 1 };
  }
  return null;
}

function isGuildAdmin(guildId, discordId) {
  const user = getGuildUser(guildId, discordId);
  if (!user) return false;
  return user.role === 'admin' || user.is_global_admin === 1;
}

function getGuildOwnerId(guildId) {
  const guild = db.prepare('SELECT owner_id FROM guilds WHERE id = ?').get(guildId);
  return guild ? guild.owner_id : null;
}

function getAdminRoleId(guildId) {
  return getServerConfig(guildId, 'admin_role_id') || '';
}

async function hasDiscordAdminRole(guildId, discordId, discordClient) {
  const adminRoleId = getAdminRoleId(guildId);
  if (!adminRoleId || !discordClient || !discordClient.guilds) return false;
  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return false;
    const member = await guild.members.fetch(discordId);
    if (!member) return false;
    return member.roles.cache.has(adminRoleId);
  } catch (err) {
    return false;
  }
}

function getGuildServers(guildId) {
  return db.prepare('SELECT * FROM guild_servers WHERE guild_id = ? ORDER BY id').all(guildId);
}

function getGuildServer(serverId) {
  return db.prepare('SELECT * FROM guild_servers WHERE id = ?').get(serverId);
}

function getActiveServer(guildId) {
  return db.prepare('SELECT * FROM guild_servers WHERE guild_id = ? AND is_active = 1 LIMIT 1').get(guildId);
}

function addGuildServer(guildId, data) {
  const stmt = db.prepare(`
    INSERT INTO guild_servers (guild_id, name, rcon_host, rcon_port, rcon_password, rest_api_host, rest_api_port, rest_api_username, server_ip, max_players, description, info_url, emblem_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    guildId,
    data.name,
    data.rcon_host,
    data.rcon_port,
    data.rcon_password,
    data.rest_api_host || data.rcon_host,
    data.rest_api_port || 8212,
    data.rest_api_username || 'admin',
    data.server_ip,
    data.max_players || 32,
    data.description || '',
    data.info_url || '',
    data.emblem_url || ''
  );
  return result.lastInsertRowid;
}

function updateGuildServer(serverId, data) {
  const fields = [];
  const values = [];
  const allowed = ['name', 'rcon_host', 'rcon_port', 'rcon_password', 'rest_api_host', 'rest_api_port', 'rest_api_username', 'server_ip', 'max_players', 'description', 'info_url', 'emblem_url', 'embed_channel_id', 'embed_message_id', 'update_interval_ms', 'starting_coins', 'coins_per_hour', 'is_active'];
  for (const [key, value] of Object.entries(data)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return false;
  values.push(serverId);
  const stmt = db.prepare(`UPDATE guild_servers SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

function deleteGuildServer(serverId) {
  const stmt = db.prepare('DELETE FROM guild_servers WHERE id = ?');
  const result = stmt.run(serverId);
  return result.changes > 0;
}

function setActiveServer(guildId, serverId) {
  db.prepare('UPDATE guild_servers SET is_active = 0 WHERE guild_id = ?').run(guildId);
  db.prepare('UPDATE guild_servers SET is_active = 1 WHERE id = ? AND guild_id = ?').run(serverId, guildId);
}

function getGuildLanguage(guildId) {
  const row = db.prepare('SELECT language FROM guilds WHERE id = ?').get(guildId);
  return row && row.language ? row.language : 'de';
}

function setGuildLanguage(guildId, language) {
  const stmt = db.prepare('UPDATE guilds SET language = ? WHERE id = ?');
  stmt.run(language, guildId);
}

function getServerConfig(guildId, key) {
  const row = db.prepare('SELECT value FROM server_config WHERE guild_id = ? AND key = ?').get(guildId, key);
  return row ? row.value : null;
}

function setServerConfig(guildId, key, value) {
  db.prepare('INSERT OR REPLACE INTO server_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, key, value);
}

function setUserRole(guildId, discordId, role) {
  ensureGuildUser(guildId, discordId, role);
  const stmt = db.prepare('UPDATE guild_users SET role = ? WHERE guild_id = ? AND discord_id = ?');
  stmt.run(role, guildId, discordId);
}

function setGuildBanned(guildId, banned) {
  const stmt = db.prepare('UPDATE guilds SET banned = ? WHERE id = ?');
  stmt.run(banned ? 1 : 0, guildId);
}

function setUserBanned(guildId, discordId, banned) {
  const stmt = db.prepare('UPDATE guild_users SET banned = ? WHERE guild_id = ? AND discord_id = ?');
  stmt.run(banned ? 1 : 0, guildId, discordId);
}

function isGuildBanned(guildId) {
  const row = db.prepare('SELECT banned FROM guilds WHERE id = ?').get(guildId);
  return row && row.banned === 1;
}

function isUserBanned(guildId, discordId) {
  const row = db.prepare('SELECT banned FROM guild_users WHERE guild_id = ? AND discord_id = ?').get(guildId, discordId);
  return row && row.banned === 1;
}

function getPublicGuilds() {
  return db.prepare('SELECT id, name, owner_id, language, bumps, created_at FROM guilds WHERE public = 1 AND banned = 0 ORDER BY bumps DESC, created_at DESC').all();
}

function getGuildPublic(guildId) {
  return db.prepare('SELECT id, name, owner_id, language, bumps, created_at FROM guilds WHERE id = ? AND public = 1 AND banned = 0').get(guildId);
}

function setGuildPublic(guildId, isPublic) {
  db.prepare('UPDATE guilds SET public = ? WHERE id = ?').run(isPublic ? 1 : 0, guildId);
}

function bumpGuild(guildId) {
  db.prepare('UPDATE guilds SET bumps = bumps + 1 WHERE id = ? AND public = 1 AND banned = 0').run(guildId);
  const row = db.prepare('SELECT bumps FROM guilds WHERE id = ?').get(guildId);
  return row ? row.bumps : 0;
}

function getGuildUsers(guildId) {
  return db.prepare('SELECT * FROM guild_users WHERE guild_id = ?').all(guildId);
}

module.exports = {
  isGlobalAdmin,
  ensureGuild,
  getGuild,
  getGuildsForUser,
  ensureGuildUser,
  getGuildUser,
  isGuildAdmin,
  getGuildOwnerId,
  getAdminRoleId,
  hasDiscordAdminRole,
  getGuildServers,
  getGuildServer,
  getActiveServer,
  addGuildServer,
  updateGuildServer,
  deleteGuildServer,
  setActiveServer,
  getGuildLanguage,
  setGuildLanguage,
  getServerConfig,
  setServerConfig,
  setUserRole,
  setGuildBanned,
  setUserBanned,
  isGuildBanned,
  isUserBanned,
  getPublicGuilds,
  getGuildPublic,
  setGuildPublic,
  bumpGuild,
  getGuildUsers,
};
