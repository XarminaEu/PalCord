const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const playerService = require('../../services/playerService');
const rconCommands = require('../../rcon/commands');
const guildService = require('../../services/guildService');

const PLATFORM_ICONS = {
  steam: '💻',
  xbox: '🎮',
  playstation: '🕹️',
  mac: '🍎',
  windows: '🪟',
  switch: '🔴',
  unknown: '❓',
};

function getPlatformIcon(platform) {
  return PLATFORM_ICONS[platform] || PLATFORM_ICONS.unknown;
}

function buildPlayerListEmbed(guildId, players, page = 0, pageSize = 10) {
  const total = players.length;
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagePlayers = players.slice(start, end);
  const guild = guildService.getGuild(guildId);

  const embed = new EmbedBuilder()
    .setTitle(`👤 Spielerliste - ${guild ? guild.name : guildId}`)
    .setDescription(`${total} Spieler online\nSpieler ${start + 1}-${end}`)
    .setColor(0x3498db);

  for (const player of pagePlayers) {
    const userId = player.userId || player.steamId || player.playerUid;
    const dbPlayer = playerService.getPlayerById(guildId, userId);
    const playtime = dbPlayer ? playerService.formatPlaytime(dbPlayer.total_playtime) : '0h 00m';
    const level = player.level || dbPlayer?.level || 1;
    const platform = player.platform || dbPlayer?.platform || 'unknown';
    const icon = getPlatformIcon(platform);
    const playerUid = player.playerUid || 'None...';
    const uidShort = playerUid.length > 16 ? playerUid.substring(0, 16) + '...' : playerUid;
    const userShort = userId.length > 16 ? userId.substring(0, 16) : userId;
    const location = player.location ? `📍 ${player.location}` : '';

    embed.addFields({
      name: `${icon} ${player.name} (Lvl ${level}) ⏱️ ${playtime}`,
      value: `├ ID: ${uidShort}\n├ User: ${userShort}${location ? '\n└ ' + location : ''}`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Wähle einen Spieler für Details' });
  return embed;
}

function buildPlayerSelectMenu(guildId, players, page = 0, pageSize = 10) {
  const total = players.length;
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagePlayers = players.slice(start, end);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`player_select_${guildId}`)
    .setPlaceholder('Spieler auswählen...')
    .setMinValues(1)
    .setMaxValues(1);

  for (const player of pagePlayers) {
    const userId = player.userId || player.steamId || player.playerUid;
    const icon = getPlatformIcon(player.platform);
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${icon} ${player.name}`)
        .setValue(userId)
        .setDescription(userId)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

function buildPlayerListButtons(guildId, players, page = 0, pageSize = 10) {
  const totalPages = Math.ceil(players.length / pageSize);
  const row = new ActionRowBuilder();

  if (page > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`playerlist_${guildId}_prev_${page}`)
        .setLabel('⏮️ Zurück')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (page < totalPages - 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`playerlist_${guildId}_next_${page}`)
        .setLabel('Weiter ⏭️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return row;
}

async function buildPlayerDetailEmbed(guildId, userId, server, isAdmin = false) {
  const onlinePlayers = server ? await playerService.getOnlinePlayers(server) : [];
  const onlinePlayer = onlinePlayers.find(p => (p.userId || p.steamId || p.playerUid) === userId);
  const dbPlayer = playerService.getPlayerById(guildId, userId);

  const name = onlinePlayer ? onlinePlayer.name : (dbPlayer ? dbPlayer.ingame_name : 'Unknown');
  const playerUid = onlinePlayer ? onlinePlayer.playerUid : (dbPlayer ? dbPlayer.player_uid : 'Unknown');
  const userIdValue = onlinePlayer ? (onlinePlayer.userId || onlinePlayer.steamId || userId) : userId;
  const platform = onlinePlayer ? onlinePlayer.platform : (dbPlayer ? dbPlayer.platform : 'unknown');
  const icon = getPlatformIcon(platform);
  const level = onlinePlayer ? (onlinePlayer.level || dbPlayer?.level || 1) : (dbPlayer ? dbPlayer.level : 1);
  const playtime = dbPlayer ? playerService.formatPlaytime(dbPlayer.total_playtime) : '0h 00m';
  const coins = dbPlayer ? dbPlayer.coins : 0;
  const location = onlinePlayer && onlinePlayer.location ? onlinePlayer.location : 'Unbekannt';
  const ping = onlinePlayer && onlinePlayer.ping ? `${onlinePlayer.ping}ms` : 'Unbekannt';

  const embed = new EmbedBuilder()
    .setTitle(`${icon} 👤 ${name}`)
    .setColor(0x3498db)
    .addFields(
      { name: 'Plattform', value: platform.toUpperCase(), inline: true },
      { name: 'Level', value: level.toString(), inline: true },
      { name: 'Ping', value: ping, inline: true },
      { name: 'Spielzeit', value: playtime, inline: true },
      { name: 'Coins', value: coins.toString(), inline: true },
      { name: 'Ort', value: location, inline: true },
      { name: 'Player UID', value: playerUid || 'None', inline: false },
      { name: 'User ID', value: userIdValue || 'None', inline: false }
    );

  if (isAdmin && server) {
    const ipResult = onlinePlayer && onlinePlayer.ip ? { success: true, response: onlinePlayer.ip } : await rconCommands.getPlayerIp(server, userId);
    if (ipResult.success) embed.addFields({ name: 'IP', value: ipResult.response || 'Unknown', inline: false });
  }

  return embed;
}

function buildPlayerDetailButtons(guildId, userId, isAdmin = false) {
  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`player_${guildId}_teleport_${userId}`)
      .setLabel('Teleport')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isAdmin)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`player_${guildId}_givecoins_${userId}`)
      .setLabel('Coins geben')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isAdmin)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`player_${guildId}_kick_${userId}`)
      .setLabel('Kick')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isAdmin)
  );
  return row;
}

module.exports = {
  buildPlayerListEmbed,
  buildPlayerSelectMenu,
  buildPlayerListButtons,
  buildPlayerDetailEmbed,
  buildPlayerDetailButtons,
};
