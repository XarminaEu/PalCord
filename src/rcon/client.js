const { Rcon } = require('rcon-client');
const logger = require('../logger');

const connections = new Map();

function getKey(server) {
  return `${server.rcon_host}:${server.rcon_port}`;
}

async function connect(server) {
  if (!server) throw new Error('No server provided for RCON connection.');
  const key = getKey(server);
  let rcon = connections.get(key);

  if (rcon && rcon.authenticated) {
    return rcon;
  }

  try {
    rcon = new Rcon({
      host: server.rcon_host,
      port: server.rcon_port,
      password: server.rcon_password,
      timeout: 10000,
    });
    await rcon.connect();
    connections.set(key, rcon);
    logger.info(`RCON connected to ${key}.`);
    return rcon;
  } catch (err) {
    logger.error(`RCON connection failed for ${key}: ${err.message}`);
    connections.delete(key);
    throw err;
  }
}

async function send(server, command) {
  if (!server) return { success: false, error: 'No server provided.', response: '' };
  try {
    const rcon = await connect(server);
    const response = await rcon.send(command);
    return { success: true, response: response.trim() };
  } catch (err) {
    logger.error(`RCON send failed for ${server.rcon_host}:${server.rcon_port}: ${err.message}`);
    return { success: false, error: err.message, response: '' };
  }
}

async function isConnected(server) {
  if (!server) return false;
  const key = getKey(server);
  const rcon = connections.get(key);
  return rcon && rcon.authenticated;
}

async function disconnect(server) {
  if (!server) {
    for (const rcon of connections.values()) {
      await rcon.end().catch(() => {});
    }
    connections.clear();
    return;
  }
  const key = getKey(server);
  const rcon = connections.get(key);
  if (rcon) {
    await rcon.end().catch(() => {});
    connections.delete(key);
  }
}

module.exports = {
  connect,
  send,
  isConnected,
  disconnect,
};
