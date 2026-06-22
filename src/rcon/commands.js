const { send } = require('./client');
const restClient = require('../rest/client');

function exec(server, cmd) {
  return send(server, cmd);
}

function showPlayers(server) {
  return send(server, 'ShowPlayers');
}

function info(server) {
  return send(server, 'Info');
}

function save(server) {
  return restClient.save(server);
}

function broadcast(server, message) {
  return restClient.announce(server, message);
}

function shutdown(server, seconds, message) {
  return restClient.shutdown(server, parseInt(seconds, 10) || 60, message);
}

function kickPlayer(server, userId, reason = 'Kicked by Admin.') {
  return restClient.kickPlayer(server, userId, reason);
}

function banPlayer(server, userId, reason = 'Banned by Admin.') {
  return restClient.banPlayer(server, userId, reason);
}

function ipBanPlayer(server, userId, reason = 'Banned by Admin.') {
  return send(server, `ipban ${userId} ${reason}`);
}

function teleportToPlayer(server, userId) {
  return send(server, `TeleportToPlayer ${userId}`);
}

function teleportToMe(server, userId) {
  return send(server, `TeleportToMe ${userId}`);
}

function giveItem(server, userId, itemId, amount = 1) {
  return send(server, `give ${userId} ${itemId} ${amount}`);
}

function giveItems(server, userId, items) {
  const parts = items.map(i => `${i.itemId}:${i.amount}`).join(' ');
  return send(server, `giveitems ${userId} ${parts}`);
}

function givePal(server, userId, palId, level = 1) {
  return send(server, `givepal ${userId} ${palId} ${level}`);
}

function giveEgg(server, userId, eggId, palId, level = 1) {
  return send(server, `giveegg ${userId} ${eggId} ${palId} ${level}`);
}

function giveRelic(server, userId, amount) {
  return send(server, `give_relic ${userId} ${amount}`);
}

function giveExp(server, userId, amount) {
  return send(server, `give_exp ${userId} ${amount}`);
}

function giveTechPoints(server, userId, amount) {
  return send(server, `givetechpoints ${userId} ${amount}`);
}

function giveBossTechPoints(server, userId, amount) {
  return send(server, `givebosstechpoints ${userId} ${amount}`);
}

function learnTech(server, userId, techId) {
  return send(server, `learntech ${userId} ${techId}`);
}

function setTime(server, hour) {
  return send(server, `settime ${hour}`);
}

function alert(server, message) {
  return send(server, `alert ${message}`);
}

function pgBroadcast(server, message) {
  return send(server, `pgbroadcast ${message}`);
}

function whitelistAdd(server, userId) {
  return send(server, `whitelist_add ${userId}`);
}

function whitelistRemove(server, userId) {
  return send(server, `whitelist_remove ${userId}`);
}

function whitelistGet(server) {
  return send(server, 'whitelist_get');
}

function getPlayerPosition(server, userId) {
  return send(server, `getpos ${userId}`);
}

function getPlayerIp(server, userId) {
  return send(server, `getip ${userId}`);
}

function exportGuilds(server) {
  return send(server, 'exportguilds');
}

function getTechIds(server) {
  return send(server, 'gettechids');
}

function getSkinIds(server) {
  return send(server, 'getskinids');
}

function getRconCommands(server) {
  return send(server, 'getrconcmds');
}

function reloadConfig(server) {
  return send(server, 'reloadcfg');
}

module.exports = {
  exec,
  showPlayers,
  info,
  save,
  broadcast,
  shutdown,
  kickPlayer,
  banPlayer,
  ipBanPlayer,
  teleportToPlayer,
  teleportToMe,
  giveItem,
  giveItems,
  givePal,
  giveEgg,
  giveRelic,
  giveExp,
  giveTechPoints,
  giveBossTechPoints,
  learnTech,
  setTime,
  alert,
  pgBroadcast,
  whitelistAdd,
  whitelistRemove,
  whitelistGet,
  getPlayerPosition,
  getPlayerIp,
  exportGuilds,
  getTechIds,
  getSkinIds,
  getRconCommands,
  reloadConfig,
};
