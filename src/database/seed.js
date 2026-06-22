const db = require('./db');
const { init } = require('./init');
const path = require('path');
const logger = require('../logger');

function seed() {
  init();

  const itemData = require(path.join(__dirname, '../../Data/itemdata.json'));
  const palData = require(path.join(__dirname, '../../Data/paldata.json'));
  const techData = require(path.join(__dirname, '../../Data/techdata.json'));

  const insertItem = db.prepare('INSERT OR REPLACE INTO items (id, name, category) VALUES (?, ?, ?)');
  const itemCategories = {
    Sphere: 'sphere', Sphere_Mega: 'sphere', Sphere_Giga: 'sphere', Sphere_Tera: 'sphere',
    Sphere_Master: 'sphere', Sphere_Legend: 'sphere', Sphere_Ultimate: 'sphere', Sphere_Exotic: 'sphere',
    Arrow: 'ammo', Arrow_Poison: 'ammo', Arrow_Fire: 'ammo', Arrow_Ice: 'ammo', Arrow_Electric: 'ammo',
    Money: 'currency',
  };

  const itemTransaction = db.transaction((items) => {
    for (const item of items) {
      const category = itemCategories[item.id] || 'misc';
      insertItem.run(item.id, item.name, category);
    }
  });
  itemTransaction(itemData.items);

  const insertPal = db.prepare('INSERT OR REPLACE INTO pals (id, name, is_boss) VALUES (?, ?, ?)');
  const palTransaction = db.transaction((pals) => {
    for (const pal of pals) {
      const isBoss = pal.id.startsWith('BOSS_') || pal.id.startsWith('Boss_') ? 1 : 0;
      insertPal.run(pal.id, pal.name, isBoss);
    }
  });
  palTransaction(palData.pals);

  const insertTech = db.prepare('INSERT OR REPLACE INTO technologies (name, asset) VALUES (?, ?)');
  const techTransaction = db.transaction((techs) => {
    for (const tech of techs) {
      insertTech.run(tech.name, tech.asset);
    }
  });
  techTransaction(techData.technology);

  logger.info(`Seeded ${itemData.items.length} items, ${palData.pals.length} pals, ${techData.technology.length} technologies.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
