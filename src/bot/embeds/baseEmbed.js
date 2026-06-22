const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const baseService = require('../../services/baseService');
const guildService = require('../../services/guildService');
const db = require('../../database/db');
const logger = require('../../logger');

const guildBaseState = new Map();

function getBaseState(guildId) {
  if (!guildBaseState.has(guildId)) {
    guildBaseState.set(guildId, { message: null, interval: null });
  }
  return guildBaseState.get(guildId);
}

function buildBasesEmbed(guildId, page = 0) {
  const guild = guildService.getGuild(guildId);
  const bases = baseService.getGuildBases(guildId);
  const perPage = 10;
  const total = bases.length;
  const maxPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page + 1, maxPage);
  const start = page * perPage;
  const end = Math.min(start + perPage, total);
  const pageBases = bases.slice(start, end);

  let description = total === 0 ? '_Keine Basen eingetragen_' : '';
  if (pageBases.length > 0) {
    description = pageBases.map(b => {
      const main = b.is_main ? ' ⭐' : '';
      const coords = `X:${b.x} Y:${b.y}${b.z !== null ? ' Z:' + b.z : ''}`;
      return `**${b.name}**${main}\n${b.ingame_name || b.user_id} | ${coords} | ID: ${b.id}`;
    }).join('\n\n');
  }

  const maxBases = baseService.getMaxBases(guildId);
  const embed = new EmbedBuilder()
    .setTitle(`🏠 Basen - ${guild ? guild.name : guildId}`)
    .setDescription(description)
    .setColor(0x3498db)
    .setFooter({ text: `Seite ${currentPage}/${maxPage} | ${total} Basen insgesamt | Max ${maxBases} pro User` });

  return { embed, total, maxPage, currentPage };
}

function buildBasesButtons(guildId, page = 0, maxPage = 1) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bases_prev_${guildId}_${page}`)
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`bases_next_${guildId}_${page}`)
      .setLabel('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page + 1 >= maxPage),
    new ButtonBuilder()
      .setCustomId(`base_delete_start_${guildId}`)
      .setLabel('🗑️ Basis löschen')
      .setStyle(ButtonStyle.Danger)
  );
}

async function showBasesList(interaction, guildId, page = 0, ephemeral = true) {
  const { embed, total, maxPage } = buildBasesEmbed(guildId, page);
  const components = [];
  if (total > 0) components.push(buildBasesButtons(guildId, page, maxPage));
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ embeds: [embed], components, ephemeral });
  } else {
    await interaction.reply({ embeds: [embed], components, ephemeral });
  }
}

async function showBaseDeleteUserSelect(interaction, guildId) {
  const isAdmin = interaction.member.permissions.has('Administrator') || guildService.isGuildAdmin(guildId, interaction.user.id);
  let options = [];
  if (isAdmin) {
    const players = db.prepare('SELECT DISTINCT user_id, ingame_name, discord_id FROM players WHERE guild_id = ?').all(guildId);
    options = players.map(p => new StringSelectMenuOptionBuilder().setLabel(p.ingame_name || p.user_id).setValue(p.user_id));
  } else {
    const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
    if (!player) {
      await interaction.reply({ content: '❌ Account nicht verknüpft.', ephemeral: true });
      return;
    }
    options = [new StringSelectMenuOptionBuilder().setLabel(player.ingame_name || player.user_id).setValue(player.user_id)];
  }
  if (options.length === 0) {
    await interaction.reply({ content: 'Keine Spieler verknüpft.', ephemeral: true });
    return;
  }
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`base_delete_user_${guildId}`)
      .setPlaceholder('Spieler wählen')
      .addOptions(options)
  );
  await interaction.reply({ content: 'Wähle einen Spieler, dessen Basis gelöscht werden soll:', components: [row], ephemeral: true });
}

async function showBaseDeleteSelect(interaction, guildId, userId) {
  const bases = baseService.getPlayerBases(guildId, userId);
  if (bases.length === 0) {
    await interaction.reply({ content: 'Keine Basen zum Löschen vorhanden.', ephemeral: true });
    return;
  }
  const options = bases.map(b => new StringSelectMenuOptionBuilder()
    .setLabel(`${b.name} (X:${b.x} Y:${b.y} ID:${b.id})`)
    .setValue(String(b.id)));
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`base_delete_confirm_${guildId}`)
      .setPlaceholder('Basis zum Löschen wählen')
      .addOptions(options)
  );
  await interaction.reply({ content: 'Wähle die Basis, die gelöscht werden soll:', components: [row], ephemeral: true });
}

async function startBasesEmbedUpdate(client, guildId, channelId) {
  const state = getBaseState(guildId);
  if (state.interval) clearInterval(state.interval);
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const { embed, total } = buildBasesEmbed(guildId, 0);
  const components = total > 0 ? [buildBasesButtons(guildId, 0, Math.ceil(total / 10))] : [];
  state.message = await channel.send({ embeds: [embed], components }).catch(err => {
    logger.error(`Failed to send bases embed: ${err.message}`);
    return null;
  });

  state.interval = setInterval(async () => {
    if (!state.message) return;
    const { embed: updatedEmbed, total: updatedTotal } = buildBasesEmbed(guildId, 0);
    const updatedComponents = updatedTotal > 0 ? [buildBasesButtons(guildId, 0, Math.ceil(updatedTotal / 10))] : [];
    try {
      await state.message.edit({ embeds: [updatedEmbed], components: updatedComponents });
    } catch (err) {
      logger.error(`Failed to update bases embed: ${err.message}`);
    }
  }, 60000);
}

async function refreshBasesEmbed(client, guildId) {
  const state = getBaseState(guildId);
  if (!state.message) return;
  const { embed, total } = buildBasesEmbed(guildId, 0);
  const components = total > 0 ? [buildBasesButtons(guildId, 0, Math.ceil(total / 10))] : [];
  try {
    await state.message.edit({ embeds: [embed], components });
  } catch (err) {
    logger.error(`Failed to refresh bases embed: ${err.message}`);
  }
}

module.exports = {
  buildBasesEmbed,
  buildBasesButtons,
  showBasesList,
  showBaseDeleteUserSelect,
  showBaseDeleteSelect,
  startBasesEmbedUpdate,
  refreshBasesEmbed,
  getBaseState,
};
