const { init } = require('./init');
const dataImportService = require('../services/dataImportService');
const logger = require('../logger');

function seed() {
  init();
  const { source, result } = dataImportService.importFromFiles();
  logger.info(`Seeded ${result.items} items, ${result.pals} pals, ${result.technologies} technologies from ${source}.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
