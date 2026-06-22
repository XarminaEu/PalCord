const guildService = require('../../services/guildService');
const rconCommands = require('../../rcon/commands');
const restClient = require('../../rest/client');
const db = require('../../database/db');
const logger = require('../../logger');

module.exports = async function chatbridgeHandler(client, message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  const guildId = message.guild.id;
  const channelId = guildService.getServerConfig(guildId, 'chatbridge_channel_id');
  if (!channelId || message.channel.id !== channelId) return;

  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, message.author.id);
  if (!player) {
    await message.react('❌');
    await message.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`, um ingame zu schreiben.', allowedMentions: { repliedUser: false } }).catch(() => {});
    return;
  }

  const server = guildService.getActiveServer(guildId);
  if (!server) {
    await message.react('❌');
    return;
  }

  const text = message.content.trim();
  if (!text) return;
  const maxLength = 120;
  const displayName = player.ingame_name || message.author.username;
  const broadcast = `[Discord] ${displayName}: ${text.length > maxLength ? text.substring(0, maxLength) + '...' : text}`;

  try {
    let result = null;
    if (server.rest_api_host && server.rest_api_port) {
      result = await restClient.announce(server, broadcast);
    } else {
      result = await rconCommands.broadcast(server, broadcast);
    }
    if (result && result.success) {
      await message.react('✅');
    } else {
      await message.react('⚠️');
      logger.warn(`Chatbridge broadcast failed: ${result?.error || 'Unknown'}`);
    }
  } catch (err) {
    logger.error(`Chatbridge error: ${err.message}`);
    await message.react('⚠️');
  }
};
