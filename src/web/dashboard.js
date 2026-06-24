const express = require('express');
const path = require('path');
const config = require('../config');
const db = require('../database/db');
const guildService = require('../services/guildService');
const playerService = require('../services/playerService');
const shopService = require('../services/shopService');
const baseService = require('../services/baseService');
const scheduledBroadcastService = require('../services/scheduledBroadcastService');
const serverStatusService = require('../services/serverStatusService');
const { isConnected } = require('../rcon/client');
const logger = require('../logger');
const { client: discordClient } = require('../bot/client');
const router = express.Router();
const copyrightService = require('../services/copyrightService');
const dataImportService = require('../services/dataImportService');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

async function ensureCopyright(req, res, next) {
  const allowed = await copyrightService.verifyRemote();
  if (allowed) return next();
  res.status(403).send(`<!DOCTYPE html><html><head><title>Copyright Error</title><style>body{font-family:sans-serif;background:#1a1a2e;color:#fff;padding:2rem;text-align:center;}</style></head><body><h1>Copyright Verification Failed</h1><p>${copyrightService.COPYRIGHT}</p><p>Application will not start.</p></body></html>`);
}

router.use(ensureCopyright);

function isGlobalAdmin(req) {
  return req.user && req.user.id === config.globalAdminId;
}

function getBotGuildIds() {
  if (!discordClient || !discordClient.guilds) return new Set();
  return new Set(discordClient.guilds.cache.map(g => g.id));
}

function canAccessGuild(req, guildId) {
  if (isGlobalAdmin(req)) return true;
  if (!req.user || !req.user.guilds) return false;
  return req.user.guilds.some(g => g.id === guildId);
}

async function isGuildAdmin(req, guildId) {
  if (isGlobalAdmin(req)) return true;
  if (guildService.isGuildAdmin(guildId, req.user.id)) return true;
  const ownerId = guildService.getGuildOwnerId(guildId);
  if (ownerId && req.user.id === ownerId) return true;
  if (await guildService.hasDiscordAdminRole(guildId, req.user.id, discordClient)) return true;
  return false;
}

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'terms.html'));
});

router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'privacy.html'));
});

router.get('/imprint', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'imprint.html'));
});

router.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nDisallow: /dashboard\nDisallow: /api/\nDisallow: /auth/\nAllow: /\nAllow: /terms\nAllow: /privacy\nAllow: /imprint\nSitemap: ${config.app.url}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'application/xml');
  const today = new Date().toISOString().split('T')[0];
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.app.url}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${config.app.url}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${config.app.url}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${config.app.url}/imprint</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
});

router.get('/api/public/status', async (req, res) => {
  try {
    const anyServer = db.prepare('SELECT * FROM guild_servers WHERE is_active = 1 LIMIT 1').get();
    if (!anyServer) return res.json({ error: 'No public server' });
    const status = await serverStatusService.getStatus(anyServer.guild_id, anyServer);
    return res.json({ name: anyServer.name, isOnline: status.isOnline, currentPlayers: status.currentPlayers, maxPlayers: status.maxPlayers, address: anyServer.server_ip || '-' });
  } catch (err) {
    logger.error(`Public status error: ${err.message}`);
    res.status(500).json({ error: 'Status unavailable' });
  }
});

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

router.get('/api/me', ensureAuthenticated, async (req, res) => {
  res.json({
    user: req.user,
    isGlobalAdmin: isGlobalAdmin(req),
  });
});

router.get('/api/items', ensureAuthenticated, async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT id, name, category FROM items';
  let params = [];
  if (search) {
    query += ' WHERE name LIKE ?';
    params = [`%${search}%`];
  }
  query += ' ORDER BY name LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

router.get('/api/pals', ensureAuthenticated, async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT id, name FROM pals';
  let params = [];
  if (search) {
    query += ' WHERE name LIKE ?';
    params = [`%${search}%`];
  }
  query += ' ORDER BY name LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

router.get('/api/guilds/:guildId/bases', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  let bases = baseService.getGuildBases(guildId);
  if (!(await isGuildAdmin(req, guildId))) {
    bases = bases.filter(b => b.discord_id === req.user.id);
  }
  res.json(bases);
});

router.post('/api/guilds/:guildId/bases', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  let { user_id, name, x, y, z, description, is_main } = req.body;
  if (!name || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!(await isGuildAdmin(req, guildId))) {
    const player = db.prepare('SELECT user_id FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, req.user.id);
    if (!player) return res.status(403).json({ error: 'Link your account first' });
    user_id = player.user_id;
  }
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  try {
    const id = baseService.addBase(guildId, user_id, { name, x, y, z, description, is_main });
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/api/guilds/:guildId/bases/:id', ensureAuthenticated, async (req, res) => {
  const { guildId, id } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const base = baseService.getBaseById(parseInt(id), guildId);
  if (!base) return res.status(404).json({ error: 'Base not found' });
  if (!(await isGuildAdmin(req, guildId))) {
    const player = db.prepare('SELECT user_id FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, req.user.id);
    if (!player || player.user_id !== base.user_id) return res.status(403).json({ error: 'Forbidden' });
  }
  const ok = baseService.updateBase(parseInt(id), guildId, null, req.body);
  if (!ok) return res.status(404).json({ error: 'Base not found' });
  res.json({ ok: true });
});

router.delete('/api/guilds/:guildId/bases/:id', ensureAuthenticated, async (req, res) => {
  const { guildId, id } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const base = baseService.getBaseById(parseInt(id), guildId);
  if (!base) return res.status(404).json({ error: 'Base not found' });
  if (!(await isGuildAdmin(req, guildId))) {
    const player = db.prepare('SELECT user_id FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, req.user.id);
    if (!player || player.user_id !== base.user_id) return res.status(403).json({ error: 'Forbidden' });
  }
  const ok = baseService.deleteBase(parseInt(id), guildId, null);
  if (!ok) return res.status(404).json({ error: 'Base not found' });
  res.json({ ok: true });
});

const SETTINGS_KEYS = ['welcome_channel_id', 'auto_role_id', 'notification_channel_id', 'daily_reminder_channel_id', 'admin_role_id', 'rules'];

router.get('/api/guilds/:guildId/channels', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.json([]);
    const channels = guild.channels.cache
      .filter(c => c.isTextBased())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
  } catch (err) {
    logger.error(`Channels error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/guilds/:guildId/roles', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  try {
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.json([]);
    const roles = guild.roles.cache
      .filter(r => !r.managed && r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.color }));
    res.json(roles);
  } catch (err) {
    logger.error(`Roles error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/imprint', (req, res) => {
  res.json(config.imprint);
});

router.get('/api/data/counts', (req, res) => {
  res.json(dataImportService.getCounts());
});

router.get('/api/config', (req, res) => {
  res.json({
    inviteEnabled: config.discord.inviteEnabled,
    inviteUrl: config.discord.inviteEnabled && config.discord.clientId
      ? `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&permissions=${config.discord.invitePermissions}&scope=bot%20applications.commands`
      : null,
  });
});

router.post('/api/data/import', ensureAuthenticated, async (req, res) => {
  if (!isGlobalAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { items, pals, technology } = req.body;
    const result = { items: 0, pals: 0, technologies: 0 };
    if (items && Array.isArray(items)) result.items = dataImportService.importItems(items);
    if (pals && Array.isArray(pals)) result.pals = dataImportService.importPals(pals);
    if (technology && Array.isArray(technology)) result.technologies = dataImportService.importTechnologies(technology);
    res.json({ ok: true, result, counts: dataImportService.getCounts() });
  } catch (err) {
    logger.error(`Data import error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/data/reseed', ensureAuthenticated, async (req, res) => {
  if (!isGlobalAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { source, result } = dataImportService.importFromFiles();
    res.json({ ok: true, source, result, counts: dataImportService.getCounts() });
  } catch (err) {
    logger.error(`Reseed error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/data/hardcoded', ensureAuthenticated, async (req, res) => {
  if (!isGlobalAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const result = dataImportService.importHardcodedData();
    res.json({ ok: true, source: 'hardcoded', result, counts: dataImportService.getCounts() });
  } catch (err) {
    logger.error(`Hardcoded import error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/guilds/:guildId/settings', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const settings = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = guildService.getServerConfig(guildId, key) || '';
  }
  res.json(settings);
});

router.get('/api/guilds/:guildId/rules', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const rules = guildService.getServerConfig(guildId, 'rules') || '';
  res.json({ rules });
});

router.post('/api/guilds/:guildId/settings', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  for (const key of SETTINGS_KEYS) {
    if (req.body[key] !== undefined) {
      guildService.setServerConfig(guildId, key, req.body[key]);
    }
  }
  res.json({ ok: true });
});

router.get('/api/guilds/:guildId/config', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  res.json({
    max_bases: guildService.getServerConfig(guildId, 'max_bases') || '5',
  });
});

router.post('/api/guilds/:guildId/config', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const { max_bases } = req.body;
  if (max_bases !== undefined) guildService.setServerConfig(guildId, 'max_bases', String(parseInt(max_bases, 10)));
  res.json({ ok: true });
});

router.get('/api/guilds/:guildId/broadcasts', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  res.json(scheduledBroadcastService.getScheduledBroadcasts(guildId));
});

router.post('/api/guilds/:guildId/broadcasts', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const { message, run_at, recurring, time } = req.body;
  if (!message || !run_at) return res.status(400).json({ error: 'Missing fields' });
  const id = scheduledBroadcastService.addScheduledBroadcast(guildId, message, run_at, { recurring: recurring ? 1 : 0, time: time || null });
  res.json({ id });
});

router.delete('/api/guilds/:guildId/broadcasts/:id', ensureAuthenticated, async (req, res) => {
  const { guildId, id } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const ok = scheduledBroadcastService.deleteScheduledBroadcast(parseInt(id), guildId);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.get('/api/guilds', ensureAuthenticated, async (req, res) => {
  const botGuildIds = getBotGuildIds();
  const guilds = [];
  for (const g of (req.user.guilds || []).filter(g => botGuildIds.has(g.id))) {
    const dbGuild = guildService.getGuild(g.id);
    guilds.push({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      hasServer: !!dbGuild,
      isAdmin: await isGuildAdmin(req, g.id),
      botPresent: true,
    });
  }
  res.json(guilds);
});

router.get('/api/guilds/:guildId', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const guild = guildService.getGuild(guildId) || { id: guildId };
  res.json({ ...guild, isAdmin: await isGuildAdmin(req, guildId) });
});

router.post('/api/guilds/:guildId/register', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const guildInfo = (req.user.guilds || []).find(g => g.id === guildId);
  const ownerId = guildInfo && guildInfo.owner ? req.user.id : guildService.getGuildOwnerId(guildId);
  guildService.ensureGuild(guildId, guildInfo ? guildInfo.name : '', ownerId || req.user.id);
  res.json({ success: true });
});

router.get('/api/guilds/:guildId/servers', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  res.json(guildService.getGuildServers(guildId));
});

router.post('/api/guilds/:guildId/servers', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  logger.info(`Server creation attempt by ${req.user.id} for guild ${guildId}: ${JSON.stringify(req.body)}`);
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const guildInfo = (req.user.guilds || []).find(g => g.id === guildId);
  guildService.ensureGuild(guildId, guildInfo ? guildInfo.name : '', req.user.id);
  try {
    const id = guildService.addGuildServer(guildId, req.body);
    logger.info(`Server created: ${id} for guild ${guildId}`);
    res.json({ id });
  } catch (err) {
    logger.error(`Server creation failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/api/guilds/:guildId/servers/:serverId', ensureAuthenticated, async (req, res) => {
  const { guildId, serverId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getGuildServer(serverId);
  if (!server || server.guild_id !== guildId) return res.status(404).json({ error: 'Server not found' });
  guildService.updateGuildServer(serverId, req.body);
  res.json({ success: true });
});

router.delete('/api/guilds/:guildId/servers/:serverId', ensureAuthenticated, async (req, res) => {
  const { guildId, serverId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getGuildServer(serverId);
  if (!server || server.guild_id !== guildId) return res.status(404).json({ error: 'Server not found' });
  guildService.deleteGuildServer(serverId);
  res.json({ success: true });
});

router.post('/api/guilds/:guildId/servers/:serverId/activate', ensureAuthenticated, async (req, res) => {
  const { guildId, serverId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  guildService.setActiveServer(guildId, serverId);
  res.json({ success: true });
});

router.get('/api/guilds/:guildId/players', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  res.json(playerService.getPlayers(guildId));
});

router.get('/api/guilds/:guildId/shop', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  res.json(shopService.getShopItems(guildId));
});

router.post('/api/guilds/:guildId/shop', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const { item_id, item_type, price, amount, level, egg_id } = req.body;
  const id = shopService.addShopItem(guildId, item_id, item_type, price, amount, level, egg_id);
  res.json({ id });
});

router.patch('/api/guilds/:guildId/shop/:itemId', ensureAuthenticated, async (req, res) => {
  const { guildId, itemId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  shopService.updateShopItem(guildId, itemId, req.body);
  res.json({ success: true });
});

router.delete('/api/guilds/:guildId/shop/:itemId', ensureAuthenticated, async (req, res) => {
  const { guildId, itemId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  shopService.deleteShopItem(guildId, itemId);
  res.json({ success: true });
});

router.get('/api/guilds/:guildId/status', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!canAccessGuild(req, guildId)) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.json({ error: 'No active server' });
  const status = await serverStatusService.getStatus(guildId, server);
  res.json(status);
});

router.post('/api/guilds/:guildId/rcon', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { command } = req.body;
  const rcon = require('../rcon/commands');
  const result = await rcon.exec(server, command);
  res.json(result);
});

router.get('/api/guilds/:guildId/users', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  res.json(guildService.getGuildUsers(guildId));
});

router.post('/api/guilds/:guildId/users/:discordId/role', ensureAuthenticated, async (req, res) => {
  const { guildId, discordId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const { role } = req.body;
  guildService.setUserRole(guildId, discordId, role);
  res.json({ success: true });
});

router.post('/api/guilds/:guildId/admin/broadcast', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });
  const result = await rconCommands.broadcast(server, message);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/save', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const result = await rconCommands.save(server);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/shutdown', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { seconds = 60, message = 'Server wird heruntergefahren' } = req.body;
  const result = await rconCommands.shutdown(server, seconds, message);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/kick', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { userId, message = 'Kick' } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const result = await rconCommands.kickPlayer(server, userId, message);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/ban', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { userId, message = 'Ban' } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const result = await rconCommands.banPlayer(server, userId, message);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/settime', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { hour } = req.body;
  if (hour === undefined || hour === null) return res.status(400).json({ error: 'Missing hour' });
  const result = await rconCommands.setTime(server, hour);
  res.json(result);
});

router.post('/api/guilds/:guildId/admin/whitelist', ensureAuthenticated, async (req, res) => {
  const { guildId } = req.params;
  if (!(await isGuildAdmin(req, guildId))) return res.status(403).json({ error: 'Forbidden' });
  const server = guildService.getActiveServer(guildId);
  if (!server) return res.status(400).json({ error: 'No active server' });
  const { action, userId } = req.body;
  let result;
  if (action === 'add') {
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    result = await rconCommands.whitelistAdd(server, userId);
  } else if (action === 'remove') {
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    result = await rconCommands.whitelistRemove(server, userId);
  } else if (action === 'get') {
    result = await rconCommands.whitelistGet(server);
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
  res.json(result);
});

module.exports = router;
