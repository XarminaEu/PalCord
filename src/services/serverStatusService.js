const restClient = require('../rest/client');
const rconCommands = require('../rcon/commands');
const db = require('../database/db');
const logger = require('../logger');
const playerService = require('./playerService');
const guildService = require('./guildService');

function parseInfo(data, serverName) {
  if (!data || !data.success || !data.data) {
    return { version: 'Unknown', name: serverName };
  }
  const info = data.data;
  const version = info.version || 'Unknown';
  const name = info.servername || info.name || serverName;
  return { version, name };
}

async function getStatus(guildId, server) {
  if (!server) {
    return { isOnline: false, name: 'No server configured', version: 'Unknown', address: '-', currentPlayers: 0, maxPlayers: 0, playerNames: [], bansCount: 0, description: '', infoUrl: '', emblemUrl: '' };
  }

  const infoResult = await restClient.getInfo(server);
  const info = parseInfo(infoResult, server.name);

  let onlinePlayers = [];
  if (infoResult.success) {
    const playersResult = await restClient.getPlayers(server);
    if (playersResult.success && Array.isArray(playersResult.data.players)) {
      onlinePlayers = playersResult.data.players.map(p => {
        const userId = playerService.normalizeUserId(p.userId);
        return {
          name: p.name,
          playerUid: p.playerId,
          userId,
          steamId: userId,
          platform: playerService.detectPlatform(userId),
          level: p.level || 1,
          ip: p.ip,
          ping: p.ping,
          location: p.location,
        };
      });
    }
  }

  playerService.syncPlayers(guildId, onlinePlayers, server);

  const isOnline = infoResult.success;
  const currentPlayers = onlinePlayers.length;
  const maxPlayers = server.max_players;
  const playerNames = onlinePlayers.map(p => p.name);

  const bansRow = guildService.getServerConfig(guildId, 'server_bans_count');
  const bansCount = bansRow ? parseInt(bansRow, 10) || 0 : 0;

  return {
    isOnline,
    name: info.name,
    version: info.version,
    address: server.server_ip,
    currentPlayers,
    maxPlayers,
    playerNames,
    bansCount,
    description: server.description || '',
    infoUrl: server.info_url || '',
    emblemUrl: server.emblem_url || '',
  };
}

module.exports = {
  getStatus,
  parseInfo,
};
