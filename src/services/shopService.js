const db = require('../database/db');
const logger = require('../logger');
const playerService = require('./playerService');
const rconCommands = require('../rcon/commands');

function getShopItems(guildId) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND is_active = 1 ORDER BY item_type, price ASC').all(guildId);
}

function getShopItemById(guildId, id) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND id = ?').get(guildId, id);
}

function addShopItem(guildId, itemId, itemType, price, amount = 1, level = null, eggId = null) {
  const stmt = db.prepare('INSERT INTO shop_items (guild_id, item_id, item_type, price, amount, level, egg_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(guildId, itemId, itemType, price, amount, level, eggId);
  return result.lastInsertRowid;
}

function updateShopItem(guildId, id, updates) {
  const fields = [];
  const values = [];
  const allowed = ['item_id', 'item_type', 'price', 'amount', 'level', 'egg_id', 'is_active'];
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return false;
  values.push(guildId, id);
  const stmt = db.prepare(`UPDATE shop_items SET ${fields.join(', ')} WHERE guild_id = ? AND id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

function deleteShopItem(guildId, id) {
  const stmt = db.prepare('DELETE FROM shop_items WHERE guild_id = ? AND id = ?');
  const result = stmt.run(guildId, id);
  return result.changes > 0;
}

function resolveItemName(shopItem) {
  if (shopItem.item_type === 'pal') {
    const row = db.prepare('SELECT name FROM pals WHERE id = ?').get(shopItem.item_id);
    return row ? row.name : shopItem.item_id;
  }
  if (shopItem.item_type === 'tech') {
    const row = db.prepare('SELECT name FROM technologies WHERE asset = ?').get(shopItem.item_id);
    return row ? row.name : shopItem.item_id;
  }
  const row = db.prepare('SELECT name FROM items WHERE id = ?').get(shopItem.item_id);
  return row ? row.name : shopItem.item_id;
}

async function buyItem(guildId, playerId, shopItemId, server) {
  const transaction = db.transaction(() => {
    const shopItem = db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND id = ? AND is_active = 1').get(guildId, shopItemId);
    if (!shopItem) throw new Error('Shop item not found.');

    const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND user_id = ?').get(guildId, playerId);
    if (!player) throw new Error('Player not found.');
    if (player.coins < shopItem.price) throw new Error('Not enough coins.');

    const coinsBefore = player.coins;
    const coinsAfter = player.coins - shopItem.price;
    db.prepare('UPDATE players SET coins = ? WHERE guild_id = ? AND user_id = ?').run(coinsAfter, guildId, playerId);

    const transStmt = db.prepare('INSERT INTO transactions (guild_id, player_id, shop_item_id, coins_before, coins_after, status) VALUES (?, ?, ?, ?, ?, ?)');
    const transId = transStmt.run(guildId, playerId, shopItemId, coinsBefore, coinsAfter, 'pending').lastInsertRowid;

    return { shopItem, transId, coinsBefore, coinsAfter };
  });

  const { shopItem, transId, coinsBefore, coinsAfter } = transaction();
  const itemName = resolveItemName(shopItem);

  let rconCommand = '';
  let rconResult = null;

  try {
    switch (shopItem.item_type) {
      case 'item':
        rconCommand = `/give ${playerId} ${shopItem.item_id} ${shopItem.amount}`;
        rconResult = await rconCommands.giveItem(server, playerId, shopItem.item_id, shopItem.amount);
        break;
      case 'pal':
        rconCommand = `/givepal ${playerId} ${shopItem.item_id} ${shopItem.level || 1}`;
        rconResult = await rconCommands.givePal(server, playerId, shopItem.item_id, shopItem.level || 1);
        break;
      case 'egg':
        rconCommand = `/giveegg ${playerId} ${shopItem.egg_id} ${shopItem.item_id} ${shopItem.level || 1}`;
        rconResult = await rconCommands.giveEgg(server, playerId, shopItem.egg_id, shopItem.item_id, shopItem.level || 1);
        break;
      case 'relic':
        rconCommand = `/give_relic ${playerId} ${shopItem.amount}`;
        rconResult = await rconCommands.giveRelic(server, playerId, shopItem.amount);
        break;
      case 'techpoints':
        rconCommand = `/givetechpoints ${playerId} ${shopItem.amount}`;
        rconResult = await rconCommands.giveTechPoints(server, playerId, shopItem.amount);
        break;
      case 'exp':
        rconCommand = `/give_exp ${playerId} ${shopItem.amount}`;
        rconResult = await rconCommands.giveExp(server, playerId, shopItem.amount);
        break;
      default:
        throw new Error('Unsupported item type.');
    }

    if (!rconResult || !rconResult.success) {
      throw new Error(rconResult ? rconResult.error : 'RCON failed.');
    }

    db.prepare('UPDATE transactions SET rcon_command = ?, rcon_response = ?, status = ? WHERE id = ?')
      .run(rconCommand, rconResult.response, 'success', transId);

    logger.info(`Player ${playerId} bought ${itemName} for ${shopItem.price} coins.`);
    return { success: true, itemName, price: shopItem.price, coinsAfter, rconResponse: rconResult.response };
  } catch (err) {
    db.prepare('UPDATE players SET coins = coins + ? WHERE guild_id = ? AND user_id = ?').run(shopItem.price, guildId, playerId);
    db.prepare('UPDATE transactions SET rcon_command = ?, rcon_response = ?, status = ? WHERE id = ?')
      .run(rconCommand, err.message, 'failed', transId);
    logger.error(`Shop purchase failed for ${playerId}: ${err.message}`);
    return { success: false, error: err.message, refunded: true };
  }
}

function getTransactions(guildId, limit = 50, offset = 0) {
  return db.prepare('SELECT * FROM transactions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(guildId, limit, offset);
}

module.exports = {
  getShopItems,
  getShopItemById,
  addShopItem,
  updateShopItem,
  deleteShopItem,
  resolveItemName,
  buyItem,
  getTransactions,
};
