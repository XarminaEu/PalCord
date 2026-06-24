const config = require('../../config');
const guildService = require('../../services/guildService');
const logger = require('../../logger');
const path = require('path');
const fs = require('fs');
const { startStatusUpdates } = require('../embeds/serverEmbed');
const { startBasesEmbedUpdate } = require('../embeds/baseEmbed');

module.exports = async function readyHandler(client) {
  logger.info(`Bot logged in as ${client.user.tag}`);

  const logoPath = path.join(__dirname, '..', '..', '..', 'PalCord_logo_echt_transparent.png');
  if (fs.existsSync(logoPath)) {
    try {
      await client.user.setAvatar(logoPath);
      logger.info('Bot avatar updated to logo.');
    } catch (err) {
      logger.warn(`Failed to set bot avatar: ${err.message}`);
    }
  }

  if (!config.discord.guildId) {
    logger.warn('DISCORD_GUILD_ID not set. Commands will not be registered.');
  }

  const guilds = client.guilds.cache;
  for (const guild of guilds.values()) {
    guildService.ensureGuild(guild.id, guild.name, guild.ownerId);
    const server = guildService.getActiveServer(guild.id);
    if (server && server.embed_channel_id) {
      try {
        await startStatusUpdates(client, guild.id);
        logger.info(`Started status updates for guild ${guild.id}.`);
      } catch (err) {
        logger.error(`Failed to start status updates for guild ${guild.id}: ${err.message}`);
      }
    }
    const basesChannelId = guildService.getServerConfig(guild.id, 'bases_channel_id');
    if (basesChannelId) {
      try {
        await startBasesEmbedUpdate(client, guild.id, basesChannelId);
        logger.info(`Started bases embed updates for guild ${guild.id}.`);
      } catch (err) {
        logger.error(`Failed to start bases embed updates for guild ${guild.id}: ${err.message}`);
      }
    }
  }
};
