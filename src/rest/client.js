const axios = require('axios');
const logger = require('../logger');

function getBaseUrl(server) {
  const host = server.rest_api_host || server.rcon_host;
  const port = server.rest_api_port || 8212;
  return `http://${host}:${port}/v1/api`;
}

function getAuth(server) {
  return {
    username: server.rest_api_username || 'admin',
    password: server.rcon_password,
  };
}

async function request(server, method, path, body = null) {
  try {
    const url = `${getBaseUrl(server)}${path}`;
    const response = await axios({
      method,
      url,
      data: body,
      auth: getAuth(server),
      timeout: 10000,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    });
    return { success: true, status: response.status, data: response.data };
  } catch (err) {
    const status = err.response ? err.response.status : null;
    const data = err.response ? err.response.data : null;
    logger.error(`REST API error ${path}: ${status} ${err.message}`);
    return { success: false, status, data, error: err.message };
  }
}

async function getInfo(server) {
  return request(server, 'GET', '/info');
}

async function getPlayers(server) {
  return request(server, 'GET', '/players');
}

async function getMetrics(server) {
  return request(server, 'GET', '/metrics');
}

async function getSettings(server) {
  return request(server, 'GET', '/settings');
}

async function announce(server, message) {
  return request(server, 'POST', '/announce', { message });
}

async function save(server) {
  return request(server, 'POST', '/save');
}

async function shutdown(server, waittime, message) {
  return request(server, 'POST', '/shutdown', { waittime, message });
}

async function stop(server) {
  return request(server, 'POST', '/stop');
}

async function kickPlayer(server, userid, message) {
  return request(server, 'POST', '/kick', { userid, message });
}

async function banPlayer(server, userid, message) {
  return request(server, 'POST', '/ban', { userid, message });
}

async function unbanPlayer(server, userid) {
  return request(server, 'POST', '/unban', { userid });
}

module.exports = {
  request,
  getInfo,
  getPlayers,
  getMetrics,
  getSettings,
  announce,
  save,
  shutdown,
  stop,
  kickPlayer,
  banPlayer,
  unbanPlayer,
};
