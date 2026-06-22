const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const serverStatusService = require('../../services/serverStatusService');
const guildService = require('../../services/guildService');
const baseService = require('../../services/baseService');
const logger = require('../../logger');
const eventHandlers = require('../handlers/events');

const guildState = new Map();

function getState(guildId) {
  if (!guildState.has(guildId)) {
    guildState.set(guildId, { interval: null, message: null });
  }
  return guildState.get(guildId);
}

function buildServerEmbed(status, serverName, guildId) {
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${status.name || serverName}`)
    .setDescription('**Server Status**')
    .setColor(status.isOnline ? 0x57f287 : 0xed4245)
    .setThumbnail(status.emblemUrl || null)
    .addFields(
      { name: 'Status', value: status.isOnline ? '🟢 Online' : '🔴 Offline', inline: true },
      { name: 'Spieler', value: `${status.currentPlayers}/${status.maxPlayers}`, inline: true },
      { name: 'Adresse', value: status.address || '-', inline: true },
      { name: 'Version', value: status.version || 'Unknown', inline: false }
    );

  if (status.description) {
    embed.addFields({ name: 'Beschreibung', value: status.description, inline: false });
  }

  if (status.infoUrl) {
    embed.addFields({ name: '📋 Server Info', value: `[Vollstaendige Config ansehen](${status.infoUrl})`, inline: false });
  }

  let playerText = '_Keine Spieler online_';
  if (status.playerNames && status.playerNames.length > 0) {
    const shown = status.playerNames.slice(0, 5);
    const remaining = status.playerNames.length - shown.length;
    playerText = shown.join(', ');
    if (remaining > 0) {
      playerText += ` (+${remaining} weitere)`;
    }
  }
  embed.addFields({ name: '👤 Online Spieler', value: playerText, inline: false });

  const basesCount = baseService.getGuildBases(guildId).length;
  embed.addFields(
    { name: '🏠 Basen', value: `${basesCount} eingetragen`, inline: true },
    { name: '🛡️ Bans', value: (status.bansCount || 0).toString(), inline: true }
  );

  embed.setFooter({ text: 'Auto-updates alle 60s • Klicke auf Spielerliste für Details' });

  return embed;
}

function buildServerButtons(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`playerlist_${guildId}`)
      .setLabel('Spielerliste')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`base_add_${guildId}`)
      .setLabel('🏠 Basis eintragen')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`bases_list_${guildId}`)
      .setLabel('🏠 Basen')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`refresh_status_${guildId}`)
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`shop_${guildId}`)
      .setLabel('Shop')
      .setStyle(ButtonStyle.Success)
  );
}

async function updateStatusEmbed(client, guildId) {
  const state = getState(guildId);
  try {
    const server = guildService.getActiveServer(guildId);
    if (!server || !server.embed_channel_id) {
      logger.warn(`No active server or embed channel for guild ${guildId}`);
      return;
    }
    const channel = await client.channels.fetch(server.embed_channel_id);
    if (!channel) {
      logger.warn(`Embed channel ${server.embed_channel_id} not found for guild ${guildId}`);
      return;
    }

    const status = await serverStatusService.getStatus(guildId, server);
    eventHandlers.checkStatusNotifications(client, guildId, status).catch(() => {});
    const embed = buildServerEmbed(status, server.name, guildId);
    const buttons = buildServerButtons(guildId);

    if (!state.message) {
      if (server.embed_message_id) {
        try {
          state.message = await channel.messages.fetch(server.embed_message_id);
        } catch (err) {
          logger.warn(`Could not fetch existing status embed for guild ${guildId}, creating new one.`);
          state.message = null;
        }
      }
    }

    if (state.message) {
      await state.message.edit({ embeds: [embed], components: [buttons] });
    } else {
      state.message = await channel.send({ embeds: [embed], components: [buttons] });
      guildService.updateGuildServer(server.id, { embed_message_id: state.message.id });
      try {
        await state.message.pin();
      } catch (err) {
        logger.warn(`Could not pin status embed for guild ${guildId}.`);
      }
    }
  } catch (err) {
    logger.error(`Failed to update status embed for guild ${guildId}: ${err.message}`);
  }
}

async function startStatusUpdates(client, guildId) {
  const state = getState(guildId);
  await updateStatusEmbed(client, guildId);
  if (state.interval) clearInterval(state.interval);
  const server = guildService.getActiveServer(guildId);
  const intervalMs = server ? server.update_interval_ms : 60000;
  state.interval = setInterval(() => updateStatusEmbed(client, guildId), intervalMs);
}

async function refreshStatusEmbed(client, guildId) {
  const state = getState(guildId);
  state.message = null;
  await updateStatusEmbed(client, guildId);
}

async function stopStatusUpdates(guildId) {
  const state = getState(guildId);
  if (state.interval) clearInterval(state.interval);
  state.interval = null;
  state.message = null;
  guildState.delete(guildId);
}

module.exports = {
  buildServerEmbed,
  buildServerButtons,
  updateStatusEmbed,
  startStatusUpdates,
  refreshStatusEmbed,
  stopStatusUpdates,
};
