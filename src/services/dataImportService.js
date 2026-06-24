const db = require('../database/db');
const logger = require('../logger');
const hardcodedData = require('../data/gameData');

const itemCategories = {
  Sphere: 'sphere', Sphere_Mega: 'sphere', Sphere_Giga: 'sphere', Sphere_Tera: 'sphere',
  Sphere_Master: 'sphere', Sphere_Legend: 'sphere', Sphere_Ultimate: 'sphere', Sphere_Exotic: 'sphere',
  Arrow: 'ammo', Arrow_Poison: 'ammo', Arrow_Fire: 'ammo', Arrow_Ice: 'ammo', Arrow_Electric: 'ammo',
  Money: 'currency',
};

function importItems(items) {
  const insertItem = db.prepare('INSERT OR REPLACE INTO items (id, name, category) VALUES (?, ?, ?)');
  const transaction = db.transaction((data) => {
    for (const item of data) {
      const category = itemCategories[item.id] || 'misc';
      insertItem.run(item.id, item.name, category);
    }
  });
  transaction(items);
  logger.info(`Imported ${items.length} items`);
  return items.length;
}

function importPals(pals) {
  const insertPal = db.prepare('INSERT OR REPLACE INTO pals (id, name, is_boss) VALUES (?, ?, ?)');
  const transaction = db.transaction((data) => {
    for (const pal of data) {
      const isBoss = pal.id.startsWith('BOSS_') || pal.id.startsWith('Boss_') ? 1 : 0;
      insertPal.run(pal.id, pal.name, isBoss);
    }
  });
  transaction(pals);
  logger.info(`Imported ${pals.length} pals`);
  return pals.length;
}

function importTechnologies(technologies) {
  const clearTech = db.prepare('DELETE FROM technologies');
  const insertTech = db.prepare('INSERT OR REPLACE INTO technologies (name, asset) VALUES (?, ?)');
  const transaction = db.transaction((data) => {
    clearTech.run();
    for (const tech of data) {
      insertTech.run(tech.name, tech.asset);
    }
  });
  transaction(technologies);
  logger.info(`Imported ${technologies.length} technologies`);
  return technologies.length;
}

function importHardcodedData() {
  const result = { items: 0, pals: 0, technologies: 0 };
  try {
    result.items = importItems(hardcodedData.items);
  } catch (err) {
    logger.error(`Failed to import hardcoded items: ${err.message}`);
  }
  try {
    result.pals = importPals(hardcodedData.pals);
  } catch (err) {
    logger.error(`Failed to import hardcoded pals: ${err.message}`);
  }
  try {
    result.technologies = importTechnologies(hardcodedData.technology);
  } catch (err) {
    logger.error(`Failed to import hardcoded technologies: ${err.message}`);
  }
  return result;
}

function importFromFiles() {
  const path = require('path');
  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', '..', 'Data');
  const result = { items: 0, pals: 0, technologies: 0 };
  const hasItemFile = fs.existsSync(path.join(dataDir, 'itemdata.json'));
  const hasPalFile = fs.existsSync(path.join(dataDir, 'paldata.json'));
  const hasTechFile = fs.existsSync(path.join(dataDir, 'techdata.json'));

  if (hasItemFile || hasPalFile || hasTechFile) {
    try {
      if (hasItemFile) {
        const itemData = require(path.join(dataDir, 'itemdata.json'));
        result.items = importItems(itemData.items);
      }
    } catch (err) {
      logger.error(`Failed to import items from file: ${err.message}`);
    }
    try {
      if (hasPalFile) {
        const palData = require(path.join(dataDir, 'paldata.json'));
        result.pals = importPals(palData.pals);
      }
    } catch (err) {
      logger.error(`Failed to import pals from file: ${err.message}`);
    }
    try {
      if (hasTechFile) {
        const techData = require(path.join(dataDir, 'techdata.json'));
        result.technologies = importTechnologies(techData.technology);
      }
    } catch (err) {
      logger.error(`Failed to import technologies from file: ${err.message}`);
    }
    return { source: 'files', result };
  }

  return { source: 'hardcoded', result: importHardcodedData() };
}

function getCounts() {
  const itemCount = db.prepare('SELECT COUNT(*) AS count FROM items').get().count;
  const palCount = db.prepare('SELECT COUNT(*) AS count FROM pals').get().count;
  const techCount = db.prepare('SELECT COUNT(*) AS count FROM technologies').get().count;
  return { items: itemCount, pals: palCount, technologies: techCount };
}

module.exports = {
  importItems,
  importPals,
  importTechnologies,
  importHardcodedData,
  importFromFiles,
  getCounts,
};
