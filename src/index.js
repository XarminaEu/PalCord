const { init } = require('./database/init');
const { seed } = require('./database/seed');
const bot = require('./bot/client');
const api = require('./api/server');
const scheduledBroadcastService = require('./services/scheduledBroadcastService');
const giveawaySchedulerService = require('./services/giveawaySchedulerService');
const copyrightService = require('./services/copyrightService');
const logger = require('./logger');

(async () => {
  try {
    const remoteAllowed = await copyrightService.verifyRemote();
    if (!remoteAllowed) {
      logger.error('Remote copyright verification failed. Application will not start.');
      process.exit(1);
    }
    logger.info('Remote copyright verification passed.');
    init();
    seed();
    await bot.start();
    api.start();
    scheduledBroadcastService.startScheduler();
    giveawaySchedulerService.startScheduler(bot.client);
  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await bot.client.destroy();
  process.exit(0);
});
