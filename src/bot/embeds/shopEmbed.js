const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shopService = require('../../services/shopService');
const db = require('../../database/db');

const CATEGORIES = [
  { value: 'item', label: 'Items', emoji: '📦' },
  { value: 'pal', label: 'Pals', emoji: '🐾' },
  { value: 'egg', label: 'Eier', emoji: '🥚' },
  { value: 'relic', label: 'Relics', emoji: '🗿' },
  { value: 'techpoints', label: 'Tech Punkte', emoji: '🔬' },
  { value: 'exp', label: 'EXP Pakete', emoji: '⭐' },
];

function buildShopIntroEmbed(guildId, player) {
  return new EmbedBuilder()
    .setTitle('🛒 PalCord Shop')
    .setDescription(`Willkommen im Shop!\nDein Guthaben: **${player ? player.coins : 0} Coins**`)
    .setColor(0xf1c40f)
    .setFooter({ text: 'Wähle eine Kategorie aus' });
}

function buildCategorySelectMenu(guildId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`shop_category_${guildId}`)
    .setPlaceholder('Kategorie wählen...')
    .setMinValues(1)
    .setMaxValues(1);

  for (const cat of CATEGORIES) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${cat.emoji} ${cat.label}`)
        .setValue(cat.value)
        .setDescription(cat.label)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

function getShopItemsByCategory(guildId, category) {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND item_type = ? AND is_active = 1 ORDER BY price ASC').all(guildId, category);
}

function buildItemSelectMenu(guildId, category, items) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`shop_item_${guildId}`)
    .setPlaceholder('Item auswählen...')
    .setMinValues(1)
    .setMaxValues(1);

  for (const item of items) {
    const name = shopService.resolveItemName(item);
    const description = item.item_type === 'pal' || item.item_type === 'egg'
      ? `Lvl ${item.level || 1} | ${item.price} Coins`
      : `${item.amount}x | ${item.price} Coins`;
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(item.id.toString())
        .setDescription(description)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

function buildItemPreviewEmbed(item, player) {
  const name = shopService.resolveItemName(item);
  const embed = new EmbedBuilder()
    .setTitle(`🛒 ${name}`)
    .setColor(0xf1c40f)
    .addFields(
      { name: 'Preis', value: `${item.price} Coins`, inline: true },
      { name: 'Dein Guthaben', value: `${player ? player.coins : 0} Coins`, inline: true },
      { name: 'Typ', value: item.item_type, inline: true }
    );

  if (item.item_type === 'pal' || item.item_type === 'egg') {
    embed.addFields({ name: 'Level', value: (item.level || 1).toString(), inline: true });
  } else {
    embed.addFields({ name: 'Menge', value: item.amount.toString(), inline: true });
  }

  embed.setFooter({ text: 'Klicke auf Kaufen um den Kauf abzuschließen' });
  return embed;
}

function buildItemPreviewButtons(guildId, itemId, canAfford) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_${guildId}_buy_${itemId}`)
      .setLabel('Kaufen')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canAfford),
    new ButtonBuilder()
      .setCustomId(`shop_${guildId}_back`)
      .setLabel('Zurück')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  CATEGORIES,
  buildShopIntroEmbed,
  buildCategorySelectMenu,
  getShopItemsByCategory,
  buildItemSelectMenu,
  buildItemPreviewEmbed,
  buildItemPreviewButtons,
};
