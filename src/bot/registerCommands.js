const { REST, Routes } = require('discord.js');
const config = require('../config');
const palCommand = require('./commands/pal');
const logger = require('../logger');

if (!config.discord.clientId) {
  logger.error('Missing DISCORD_CLIENT_ID. Cannot register commands.');
  process.exit(1);
}

const commands = [palCommand.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
  try {
    logger.info(`Registering ${commands.length} slash commands...`);
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.info(`Registered guild commands for ${config.discord.guildId}.`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      logger.info('Registered global commands.');
    }
  } catch (err) {
    logger.error(`Failed to register commands: ${err.message}`);
  }
})();
