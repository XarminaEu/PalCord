const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('../config');
const readyHandler = require('./handlers/ready');
const interactionHandler = require('./handlers/interactionCreate');
const chatbridgeHandler = require('./handlers/chatbridge');
const eventHandlers = require('./handlers/events');
const guildService = require('../services/guildService');
const logger = require('../logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once('clientReady', () => readyHandler(client));
client.on('interactionCreate', (interaction) => interactionHandler(client, interaction));
client.on('messageCreate', (message) => chatbridgeHandler(client, message));
client.on('guildMemberAdd', (member) => eventHandlers.handleGuildMemberAdd(member));
client.on('guildCreate', (guild) => {
  logger.info(`Joined guild: ${guild.name} (${guild.id})`);
  guildService.ensureGuild(guild.id, guild.name, guild.ownerId);
});

client.on('guildDelete', (guild) => {
  logger.info(`Left guild: ${guild.name} (${guild.id})`);
  const { stopStatusUpdates } = require('./embeds/serverEmbed');
  stopStatusUpdates(guild.id);
  const servers = guildService.getGuildServers(guild.id);
  for (const server of servers) {
    guildService.updateGuildServer(server.id, { is_active: 0, embed_channel_id: null, embed_message_id: null });
  }
});

client.on('guildUpdate', (oldGuild, newGuild) => {
  if (oldGuild.name !== newGuild.name || oldGuild.ownerId !== newGuild.ownerId) {
    guildService.ensureGuild(newGuild.id, newGuild.name, newGuild.ownerId);
  }
});

client.on('error', (err) => logger.error(`Discord client error: ${err.message}`));
client.on('warn', (warn) => logger.warn(`Discord client warning: ${warn}`));

async function start() {
  await client.login(config.discord.token);
  eventHandlers.startDailyReminderScheduler(client);
}

module.exports = {
  client,
  start,
};
