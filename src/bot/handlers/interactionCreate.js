const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');
const serverStatusService = require('../../services/serverStatusService');
const playerService = require('../../services/playerService');
const shopService = require('../../services/shopService');
const guildService = require('../../services/guildService');
const rconCommands = require('../../rcon/commands');
const { refreshStatusEmbed } = require('../embeds/serverEmbed');
const playerEmbed = require('../embeds/playerEmbed');
const shopEmbed = require('../embeds/shopEmbed');
const baseEmbed = require('../embeds/baseEmbed');
const db = require('../../database/db');
const logger = require('../../logger');
const { t } = require('../../i18n');

function getLang(interaction) {
  const guildId = interaction.guildId || interaction.guild?.id;
  if (guildId) return guildService.getGuildLanguage(guildId);
  return interaction.locale?.startsWith('en') ? 'en' : 'de';
}

function __(interaction, key, replacements = {}) {
  return t(key, getLang(interaction), replacements);
}

function getGuildContext(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return { guildId: null, server: null };
  guildService.ensureGuild(guildId, interaction.guild.name, interaction.guild.ownerId);
  const server = guildService.getActiveServer(guildId);
  return { guildId, server };
}

function isAdmin(interaction) {
  if (!interaction.member) return false;
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator) || guildService.isGuildAdmin(interaction.guildId, interaction.user.id);
}

async function requireServer(interaction) {
  const { guildId, server } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return null;
  }
  if (!server) {
    await interaction.reply({ content: '❌ ' + __('error_no_server'), ephemeral: true });
    return null;
  }
  return { guildId, server };
}

async function handlePalServer(interaction) {
  const ctx = await requireServer(interaction);
  if (!ctx) return;
  const status = await serverStatusService.getStatus(ctx.guildId, ctx.server);
  const { buildServerEmbed, buildServerButtons } = require('../embeds/serverEmbed');
  await interaction.reply({ embeds: [buildServerEmbed(status, ctx.server.name, ctx.guildId)], components: [buildServerButtons(ctx.guildId)], ephemeral: true });
}

async function handlePalPlayers(interaction) {
  const ctx = await requireServer(interaction);
  if (!ctx) return;
  const page = (interaction.options.getInteger('page') || 1) - 1;
  const players = await playerService.getOnlinePlayers(ctx.server);
  const embed = playerEmbed.buildPlayerListEmbed(ctx.guildId, players, page);
  const selectMenu = playerEmbed.buildPlayerSelectMenu(ctx.guildId, players, page);
  const buttons = playerEmbed.buildPlayerListButtons(ctx.guildId, players, page);
  const components = [selectMenu];
  if (buttons.components.length > 0) components.push(buttons);
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

async function handlePalShop(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ Dieser Befehl funktioniert nur auf einem Discord-Server.', ephemeral: true });
    return;
  }
  const userId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, userId);
  const embed = shopEmbed.buildShopIntroEmbed(guildId, dbPlayer);
  const categoryMenu = shopEmbed.buildCategorySelectMenu(guildId);
  await interaction.reply({ embeds: [embed], components: [categoryMenu], ephemeral: true });
}

async function handlePalBalance(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ Dieser Befehl funktioniert nur auf einem Discord-Server.', ephemeral: true });
    return;
  }
  const userId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, userId);
  const coins = dbPlayer ? dbPlayer.coins : 0;
  const embed = new EmbedBuilder()
    .setTitle('💰 Dein Guthaben')
    .setDescription(`Du hast **${coins} Coins**.`)
    .setColor(0xf1c40f);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePalGive(interaction) {
  const ctx = await requireServer(interaction);
  if (!ctx) return;
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ Nur Admins können Items vergeben.', ephemeral: true });
    return;
  }
  const typeSelect = new StringSelectMenuBuilder()
    .setCustomId(`give_type_${ctx.guildId}`)
    .setPlaceholder('Typ auswählen...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('📦 Item').setValue('item'),
      new StringSelectMenuOptionBuilder().setLabel('🐾 Pal').setValue('pal'),
      new StringSelectMenuOptionBuilder().setLabel('🥚 Ei').setValue('egg'),
      new StringSelectMenuOptionBuilder().setLabel('🗿 Relic').setValue('relic'),
      new StringSelectMenuOptionBuilder().setLabel('🔬 Tech Punkte').setValue('techpoints'),
      new StringSelectMenuOptionBuilder().setLabel('⭐ EXP').setValue('exp')
    );
  const row = new ActionRowBuilder().addComponents(typeSelect);
  await interaction.reply({ content: 'Wähle den Typ des Geschenks:', components: [row], ephemeral: true });
}

async function handlePalAdmin(interaction) {
  const ctx = await requireServer(interaction);
  if (!ctx) return;
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ Nur Admins.', ephemeral: true });
    return;
  }
  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId(`admin_action_${ctx.guildId}`)
    .setPlaceholder('Aktion auswählen...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('💾 Speichern').setValue('save'),
      new StringSelectMenuOptionBuilder().setLabel('📢 Broadcast').setValue('broadcast'),
      new StringSelectMenuOptionBuilder().setLabel('⏰ Zeit setzen').setValue('settime'),
      new StringSelectMenuOptionBuilder().setLabel('🚪 Kick').setValue('kick'),
      new StringSelectMenuOptionBuilder().setLabel('🔨 Ban').setValue('ban'),
      new StringSelectMenuOptionBuilder().setLabel('🌐 IP-Ban').setValue('ipban'),
      new StringSelectMenuOptionBuilder().setLabel('🛑 Shutdown').setValue('shutdown'),
      new StringSelectMenuOptionBuilder().setLabel('💰 Coins geben').setValue('givecoins'),
      new StringSelectMenuOptionBuilder().setLabel('📋 Whitelist anzeigen').setValue('whitelist_get')
    );
  const row = new ActionRowBuilder().addComponents(actionSelect);
  await interaction.reply({ content: 'Wähle eine Admin-Aktion:', components: [row], ephemeral: true });
}

async function handlePalWhitelist(interaction) {
  const ctx = await requireServer(interaction);
  if (!ctx) return;
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ Nur Admins.', ephemeral: true });
    return;
  }
  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId(`whitelist_action_${ctx.guildId}`)
    .setPlaceholder('Aktion auswählen...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('➕ Hinzufügen').setValue('add'),
      new StringSelectMenuOptionBuilder().setLabel('➖ Entfernen').setValue('remove'),
      new StringSelectMenuOptionBuilder().setLabel('📋 Anzeigen').setValue('get')
    );
  const row = new ActionRowBuilder().addComponents(actionSelect);
  await interaction.reply({ content: 'Wähle eine Whitelist-Aktion:', components: [row], ephemeral: true });
}

async function handlePalSetup(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ Dieser Befehl funktioniert nur auf einem Discord-Server.', ephemeral: true });
    return;
  }
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ Nur Admins können das Embed einrichten.', ephemeral: true });
    return;
  }
  const channel = interaction.options.getChannel('channel');
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: 'Bitte wähle einen gültigen Text-Channel.', ephemeral: true });
    return;
  }
  const server = guildService.getActiveServer(guildId);
  if (!server) {
    await interaction.reply({ content: '❌ Kein aktiver Server vorhanden. Bitte erst im Dashboard einen Server anlegen.', ephemeral: true });
    return;
  }
  guildService.updateGuildServer(server.id, { embed_channel_id: channel.id });
  await refreshStatusEmbed(interaction.client, guildId);
  await interaction.reply({ content: `✅ Status-Embed wurde in ${channel} eingerichtet.`, ephemeral: true });
}

async function handlePalLink(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const userId = interaction.options.getString('userid');
  const discordId = interaction.user.id;

  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!player) {
    db.prepare('INSERT OR IGNORE INTO players (user_id, guild_id, discord_id, coins) VALUES (?, ?, ?, ?)').run(userId, guildId, discordId, 0);
  }

  db.prepare('UPDATE players SET discord_id = ? WHERE guild_id = ? AND user_id = ?').run(discordId, guildId, userId);
  await interaction.reply({ content: `✅ Discord-Account erfolgreich mit **${userId}** verknüpft.`, ephemeral: true });
}

async function handlePalLanguage(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: __('error_admin_only'), ephemeral: true });
    return;
  }
  const lang = interaction.options.getString('lang');
  guildService.setGuildLanguage(guildId, lang);
  await interaction.reply({ content: __('cmd_language_set', { language: lang === 'de' ? 'Deutsch' : 'English' }), ephemeral: true });
}

async function handlePalBase(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const baseService = require('../../services/baseService');
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, discordId);
  const action = interaction.options.getString('action');
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || guildService.isGuildAdmin(guildId, discordId);

  if (action === 'add') {
    const userId = player ? player.user_id : null;
    if (!userId) {
      await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`.', ephemeral: true });
      return;
    }
    const name = interaction.options.getString('name');
    const x = interaction.options.getNumber('x');
    const y = interaction.options.getNumber('y');
    const z = interaction.options.getNumber('z');
    if (!name || x === null || y === null) {
      await interaction.reply({ content: '❌ Name, X und Y sind Pflicht.', ephemeral: true });
      return;
    }
    try {
      baseService.addBase(guildId, userId, { name, x, y, z, description: null, is_main: false });
      await interaction.reply({ content: `✅ Basis **${name}** bei X:${x} Y:${y}${z !== null ? ' Z:' + z : ''} eingetragen.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  } else if (action === 'list') {
    let bases = [];
    if (isAdmin) {
      bases = baseService.getGuildBases(guildId);
    } else if (player) {
      bases = baseService.getPlayerBases(guildId, player.user_id);
    }
    if (bases.length === 0) {
      await interaction.reply({ content: 'Keine Basen eingetragen.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(isAdmin ? '🏠 Guild Basen' : '🏠 Deine Basen')
      .setColor(0x3498db)
      .setDescription(bases.map(b => `**${b.name}** ${b.is_main ? '⭐' : ''}\n${b.ingame_name || b.user_id} | X:${b.x} Y:${b.y}${b.z !== null ? ' Z:' + b.z : ''}`).join('\n\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'delete') {
    const baseEmbed = require('../embeds/baseEmbed');
    await baseEmbed.showBaseDeleteUserSelect(interaction, guildId);
    return;
  } else if (action === 'setmain') {
    const id = interaction.options.getInteger('id');
    if (!id || !player) {
      await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account und gib eine Basis-ID an.', ephemeral: true });
      return;
    }
    const ok = baseService.setMainBase(id, guildId, player.user_id);
    if (!ok) {
      await interaction.reply({ content: '❌ Basis nicht gefunden.', ephemeral: true });
      return;
    }
    await interaction.reply({ content: '✅ Hauptbasis gesetzt.', ephemeral: true });
  }
}

async function handlePalProfile(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
  if (!player) {
    await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`.', ephemeral: true });
    return;
  }
  const baseService = require('../../services/baseService');
  const bases = baseService.getPlayerBases(guildId, player.user_id);
  const mainBase = bases.find(b => b.is_main);
  const embed = new EmbedBuilder()
    .setTitle(`👤 ${player.ingame_name}`)
    .setColor(0x3498db)
    .addFields(
      { name: 'Level', value: player.level.toString(), inline: true },
      { name: 'Coins', value: player.coins.toString(), inline: true },
      { name: 'Spielzeit', value: playerService.formatPlaytime(player.total_playtime), inline: true },
      { name: 'Plattform', value: player.platform.toUpperCase(), inline: true },
      { name: 'Basen', value: bases.length.toString(), inline: true },
      { name: 'Hauptbasis', value: mainBase ? `${mainBase.name} (X:${mainBase.x} Y:${mainBase.y})` : 'Keine', inline: true }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePalLeaderboard(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const type = interaction.options.getString('type') || 'coins';
  const order = type === 'playtime' ? 'total_playtime DESC' : (type === 'level' ? 'level DESC' : 'coins DESC');
  const rows = db.prepare(`SELECT ingame_name, coins, level, total_playtime FROM players WHERE guild_id = ? ORDER BY ${order} LIMIT 10`).all(guildId);
  const title = type === 'playtime' ? '⏱️ Spielzeit' : (type === 'level' ? '📈 Level' : '💰 Coins');
  const value = type === 'playtime' ? p => playerService.formatPlaytime(p.total_playtime) : (type === 'level' ? p => p.level : p => p.coins);
  const embed = new EmbedBuilder()
    .setTitle(`🏆 Leaderboard - ${title}`)
    .setColor(0xf1c40f)
    .setDescription(rows.map((p, i) => `${i + 1}. **${p.ingame_name}** - ${value(p)}`).join('\n') || 'Keine Daten.');
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePalDaily(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
  if (!player) {
    await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`.', ephemeral: true });
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  const lastDaily = guildService.getServerConfig(guildId, `daily_${player.user_id}`);
  if (lastDaily === today) {
    await interaction.reply({ content: '❌ Du hast deine tägliche Belohnung heute schon abgeholt.', ephemeral: true });
    return;
  }
  guildService.setServerConfig(guildId, `daily_${player.user_id}`, today);
  playerService.addCoins(guildId, player.user_id, 100);
  await interaction.reply({ content: '✅ Du hast **100 Coins** tägliche Belohnung erhalten!', ephemeral: true });
}

async function handlePalPay(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  const fromPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
  if (!fromPlayer) {
    await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`.', ephemeral: true });
    return;
  }
  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  if (!targetUser || amount <= 0) {
    await interaction.reply({ content: '❌ Ungültige Eingabe.', ephemeral: true });
    return;
  }
  const toPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, targetUser.id);
  if (!toPlayer) {
    await interaction.reply({ content: '❌ Zielspieler ist nicht verknüpft.', ephemeral: true });
    return;
  }
  if (fromPlayer.coins < amount) {
    await interaction.reply({ content: '❌ Nicht genug Coins.', ephemeral: true });
    return;
  }
  playerService.addCoins(guildId, fromPlayer.user_id, -amount);
  playerService.addCoins(guildId, toPlayer.user_id, amount);
  await interaction.reply({ content: `✅ Du hast **${amount} Coins** an <@${targetUser.id}> gesendet.`, ephemeral: true });
}

async function handlePalBasesetup(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: __('error_admin_only'), ephemeral: true });
    return;
  }
  const channel = interaction.options.getChannel('channel');
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '❌ Bitte einen Text-Channel wählen.', ephemeral: true });
    return;
  }
  guildService.setServerConfig(guildId, 'bases_channel_id', channel.id);
  await baseEmbed.startBasesEmbedUpdate(interaction.client, guildId, channel.id);
  await interaction.reply({ content: `✅ Basen-Embed wurde in ${channel} eingerichtet.`, ephemeral: true });
}

async function handlePalChatbridge(interaction) {
  const { guildId } = getGuildContext(interaction);
  if (!guildId) {
    await interaction.reply({ content: '❌ ' + __('cmd_guild_only'), ephemeral: true });
    return;
  }
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: __('error_admin_only'), ephemeral: true });
    return;
  }
  const channel = interaction.options.getChannel('channel');
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '❌ Bitte einen Text-Channel wählen.', ephemeral: true });
    return;
  }
  guildService.setServerConfig(guildId, 'chatbridge_channel_id', channel.id);
  await interaction.reply({ content: `✅ Chat-Bridge wurde in ${channel} eingerichtet. Verknüpfte User können dort schreiben und es wird ingame als [Discord] ausgestrahlt.`, ephemeral: true });
}

async function handlePalAbout(interaction) {
  const copyrightService = require('../services/copyrightService');
  const embed = new EmbedBuilder()
    .setTitle(copyrightService.PROGRAM)
    .setDescription(copyrightService.COPYRIGHT)
    .setColor(0x57f287)
    .addFields(
      { name: 'Version', value: '1.0.0', inline: true },
      { name: 'Entwickler', value: 'RL-Dev.de', inline: true },
      { name: 'Lizenz', value: 'Copyright geschützt', inline: true }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePlayerListButton(interaction, guildId) {
  const server = guildService.getActiveServer(guildId);
  if (!server) {
    await interaction.reply({ content: '❌ Kein aktiver Server.', ephemeral: true });
    return;
  }
  const players = await playerService.getOnlinePlayers(server);
  const embed = playerEmbed.buildPlayerListEmbed(guildId, players, 0);
  const selectMenu = playerEmbed.buildPlayerSelectMenu(guildId, players, 0);
  const buttons = playerEmbed.buildPlayerListButtons(guildId, players, 0);
  const components = [selectMenu];
  if (buttons.components.length > 0) components.push(buttons);
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

async function handleBaseAddButton(interaction, guildId) {
  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
  if (!player) {
    await interaction.reply({ content: '❌ Verknüpfe zuerst deinen Account mit `/pal link <userId>`, um Basen eintragen zu können.', ephemeral: true });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId(`base_modal_${guildId}`)
    .setTitle('🏠 Basis eintragen');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('base_name').setLabel('Basis Name').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('base_x').setLabel('X Koordinate').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('base_y').setLabel('Y Koordinate').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('base_z').setLabel('Z Koordinate (optional)').setStyle(TextInputStyle.Short).setRequired(false))
  );
  await interaction.showModal(modal);
}

async function handleBaseModalSubmit(interaction, guildId) {
  const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
  if (!player) {
    await interaction.reply({ content: '❌ Account nicht verknüpft.', ephemeral: true });
    return;
  }
  const baseService = require('../../services/baseService');
  const name = interaction.fields.getTextInputValue('base_name');
  const x = parseFloat(interaction.fields.getTextInputValue('base_x'));
  const y = parseFloat(interaction.fields.getTextInputValue('base_y'));
  const zRaw = interaction.fields.getTextInputValue('base_z');
  const z = zRaw ? parseFloat(zRaw) : null;
  if (isNaN(x) || isNaN(y)) {
    await interaction.reply({ content: '❌ X und Y müssen gültige Zahlen sein.', ephemeral: true });
    return;
  }
  try {
    baseService.addBase(guildId, player.user_id, { name, x, y, z, description: null, is_main: false });
    await interaction.reply({ content: `✅ Basis **${name}** bei X:${x} Y:${y}${z !== null ? ' Z:' + z : ''} eingetragen.`, ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
  }
}

async function handleRefreshStatusButton(interaction, guildId) {
  await refreshStatusEmbed(interaction.client, guildId);
  await interaction.reply({ content: '✅ Server-Status wurde aktualisiert.', ephemeral: true });
}

async function handleShopButton(interaction, guildId) {
  const userId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, userId);
  const embed = shopEmbed.buildShopIntroEmbed(guildId, dbPlayer);
  const categoryMenu = shopEmbed.buildCategorySelectMenu(guildId);
  await interaction.reply({ embeds: [embed], components: [categoryMenu], ephemeral: true });
}

async function handlePlayerSelect(interaction, guildId) {
  const userId = interaction.values[0];
  const admin = isAdmin(interaction);
  const server = guildService.getActiveServer(guildId);
  const embed = await playerEmbed.buildPlayerDetailEmbed(guildId, userId, server, admin);
  const buttons = playerEmbed.buildPlayerDetailButtons(guildId, userId, admin);
  await interaction.update({ embeds: [embed], components: [buttons], ephemeral: true });
}

async function handlePlayerListPagination(interaction, customId, guildId) {
  const match = customId.match(/^playerlist_\d+_(prev|next)_(\d+)$/);
  if (!match) return;
  const direction = match[1];
  let page = parseInt(match[2], 10);
  page = direction === 'next' ? page + 1 : page - 1;
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  const players = await playerService.getOnlinePlayers(server);
  const embed = playerEmbed.buildPlayerListEmbed(guildId, players, page);
  const selectMenu = playerEmbed.buildPlayerSelectMenu(guildId, players, page);
  const buttons = playerEmbed.buildPlayerListButtons(guildId, players, page);
  const components = [selectMenu];
  if (buttons.components.length > 0) components.push(buttons);
  await interaction.update({ embeds: [embed], components, ephemeral: true });
}

async function handlePlayerDetailButton(interaction, customId, guildId) {
  const match = customId.match(/^player_\d+_(kick|givecoins|teleport)_(.+)$/);
  if (!match) return;
  const action = match[1];
  const userId = match[2];
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  if (action === 'kick') {
    const result = await rconCommands.kickPlayer(server, userId, 'Kicked by Discord Admin.');
    await interaction.reply({ content: result.success ? '✅ Spieler wurde gekickt.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (action === 'teleport') {
    const modal = new ModalBuilder().setCustomId(`teleport_modal_${guildId}`).setTitle('Teleport Ziel');
    const input = new TextInputBuilder().setCustomId('target_user').setLabel('Ziel-Spieler UserId').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  } else if (action === 'givecoins') {
    const modal = new ModalBuilder().setCustomId(`givecoins_modal_${guildId}_${userId}`).setTitle('Coins geben');
    const input = new TextInputBuilder().setCustomId('amount').setLabel('Anzahl Coins').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }
}

async function handleShopCategory(interaction, guildId) {
  const category = interaction.values[0];
  const items = shopEmbed.getShopItemsByCategory(guildId, category);
  if (items.length === 0) {
    await interaction.update({ content: 'In dieser Kategorie gibt es aktuell keine Items.', embeds: [], components: [], ephemeral: true });
    return;
  }
  const itemMenu = shopEmbed.buildItemSelectMenu(guildId, category, items);
  await interaction.update({ content: 'Wähle ein Item:', embeds: [], components: [itemMenu], ephemeral: true });
}

async function handleShopItem(interaction, guildId) {
  const itemId = parseInt(interaction.values[0], 10);
  const item = shopService.getShopItemById(guildId, itemId);
  const userId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, userId);
  const canAfford = dbPlayer && dbPlayer.coins >= item.price;
  const embed = shopEmbed.buildItemPreviewEmbed(item, dbPlayer);
  const buttons = shopEmbed.buildItemPreviewButtons(guildId, itemId, canAfford);
  await interaction.update({ content: null, embeds: [embed], components: [buttons], ephemeral: true });
}

async function handleShopBuy(interaction, customId, guildId) {
  const match = customId.match(/^shop_\d+_buy_(\d+)$/);
  if (!match) return;
  const itemId = parseInt(match[1], 10);
  const discordId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, discordId);
  if (!dbPlayer) {
    await interaction.reply({ content: 'Du musst zuerst auf dem Server online sein oder /pal link nutzen.', ephemeral: true });
    return;
  }
  const server = guildService.getActiveServer(guildId);
  if (!server) {
    await interaction.reply({ content: '❌ Kein aktiver Server.', ephemeral: true });
    return;
  }
  const result = await shopService.buyItem(guildId, dbPlayer.user_id, itemId, server);
  if (result.success) {
    await interaction.update({ content: `✅ Du hast **${result.itemName}** für **${result.price} Coins** gekauft.`, embeds: [], components: [], ephemeral: true });
  } else {
    await interaction.update({ content: `❌ Kauf fehlgeschlagen: ${result.error}`, embeds: [], components: [], ephemeral: true });
  }
}

async function handleShopBack(interaction, guildId) {
  const userId = interaction.user.id;
  const dbPlayer = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, userId);
  const embed = shopEmbed.buildShopIntroEmbed(guildId, dbPlayer);
  const categoryMenu = shopEmbed.buildCategorySelectMenu(guildId);
  await interaction.update({ content: null, embeds: [embed], components: [categoryMenu], ephemeral: true });
}

async function handleGiveType(interaction, guildId) {
  const type = interaction.values[0];
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  const players = await playerService.getOnlinePlayers(server);
  const playerSelect = new StringSelectMenuBuilder()
    .setCustomId(`give_player_${guildId}_${type}`)
    .setPlaceholder('Spieler auswählen...')
    .setMinValues(1)
    .setMaxValues(1);
  for (const player of players) {
    const userId = player.steamId || player.playerUid;
    playerSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(player.name).setValue(userId));
  }
  await interaction.update({ content: 'Wähle den Spieler:', components: [new ActionRowBuilder().addComponents(playerSelect)], ephemeral: true });
}

async function handleGivePlayer(interaction, customId, guildId) {
  const match = customId.match(/^give_player_\d+_(item|pal|egg|relic|techpoints|exp)$/);
  if (!match) return;
  const type = match[1];
  const playerId = interaction.values[0];
  const itemSelect = new StringSelectMenuBuilder()
    .setCustomId(`give_item_${guildId}_${type}_${playerId}`)
    .setPlaceholder('Item/Pal auswählen...')
    .setMinValues(1)
    .setMaxValues(1);

  if (type === 'item') {
    const items = db.prepare('SELECT * FROM items ORDER BY name LIMIT 25').all();
    for (const item of items) {
      itemSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(item.name).setValue(item.id));
    }
  } else if (type === 'pal' || type === 'egg') {
    const pals = db.prepare('SELECT * FROM pals WHERE is_boss = 0 ORDER BY name LIMIT 25').all();
    for (const pal of pals) {
      itemSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(pal.name).setValue(pal.id));
    }
  } else if (type === 'relic') {
    itemSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel('Lifmunk Effigy').setValue('relic'));
  } else if (type === 'techpoints') {
    itemSelect.addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Normal Tech Points').setValue('normal'),
      new StringSelectMenuOptionBuilder().setLabel('Ancient Tech Points').setValue('ancient')
    );
  } else if (type === 'exp') {
    itemSelect.addOptions(
      new StringSelectMenuOptionBuilder().setLabel('1000 EXP').setValue('1000'),
      new StringSelectMenuOptionBuilder().setLabel('5000 EXP').setValue('5000'),
      new StringSelectMenuOptionBuilder().setLabel('10000 EXP').setValue('10000')
    );
  }

  await interaction.update({ content: 'Wähle das Item/Pal:', components: [new ActionRowBuilder().addComponents(itemSelect)], ephemeral: true });
}

async function handleGiveItem(interaction, customId, guildId) {
  const match = customId.match(/^give_item_\d+_(item|pal|egg|relic|techpoints|exp)_(.+)$/);
  if (!match) return;
  const type = match[1];
  const playerId = match[2];
  const itemId = interaction.values[0];
  const modal = new ModalBuilder().setCustomId(`give_amount_${guildId}_${type}_${playerId}_${itemId}`).setTitle('Menge / Level');
  const input = new TextInputBuilder().setCustomId('amount').setLabel(type === 'pal' || type === 'egg' ? 'Level' : 'Menge').setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  if (type === 'egg') {
    const eggInput = new TextInputBuilder().setCustomId('egg_type').setLabel('Egg-Typ (z.B. PalEgg_Normal_01)').setStyle(TextInputStyle.Short).setValue('PalEgg_Normal_01').setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(eggInput));
  }
  await interaction.showModal(modal);
}

async function handleGiveModal(interaction, customId, guildId) {
  const match = customId.match(/^give_amount_\d+_(item|pal|egg|relic|techpoints|exp)_(.+)_(.+)$/);
  if (!match) return;
  const type = match[1];
  const playerId = match[2];
  const itemId = match[3];
  const amount = interaction.fields.getTextInputValue('amount');
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  let result = { success: false, error: 'Unknown type' };
  let description = '';

  if (type === 'item') {
    const item = db.prepare('SELECT name FROM items WHERE id = ?').get(itemId);
    result = await rconCommands.giveItem(server, playerId, itemId, amount);
    description = `${amount}x ${item ? item.name : itemId}`;
  } else if (type === 'pal') {
    const pal = db.prepare('SELECT name FROM pals WHERE id = ?').get(itemId);
    result = await rconCommands.givePal(server, playerId, itemId, amount);
    description = `${pal ? pal.name : itemId} (Lvl ${amount})`;
  } else if (type === 'egg') {
    const eggType = interaction.fields.getTextInputValue('egg_type');
    const pal = db.prepare('SELECT name FROM pals WHERE id = ?').get(itemId);
    result = await rconCommands.giveEgg(server, playerId, eggType, itemId, amount);
    description = `${eggType} mit ${pal ? pal.name : itemId} (Lvl ${amount})`;
  } else if (type === 'relic') {
    result = await rconCommands.giveRelic(server, playerId, amount);
    description = `${amount}x Lifmunk Effigy`;
  } else if (type === 'techpoints') {
    if (itemId === 'ancient') {
      result = await rconCommands.giveBossTechPoints(server, playerId, amount);
      description = `${amount} Ancient Tech Points`;
    } else {
      result = await rconCommands.giveTechPoints(server, playerId, amount);
      description = `${amount} Tech Points`;
    }
  } else if (type === 'exp') {
    result = await rconCommands.giveExp(server, playerId, amount);
    description = `${amount} EXP`;
  }

  await interaction.reply({
    content: result.success ? `✅ ${description} an ${playerId} gegeben.` : `❌ Fehler: ${result.error}`,
    ephemeral: true,
  });
}

async function handleAdminAction(interaction, guildId) {
  const action = interaction.values[0];
  const server = guildService.getActiveServer(guildId);
  if (!server) return;

  if (action === 'save') {
    const result = await rconCommands.save(server);
    await interaction.reply({ content: result.success ? '✅ Welt wurde gespeichert.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (action === 'broadcast') {
    const modal = new ModalBuilder().setCustomId(`broadcast_modal_${guildId}`).setTitle('Broadcast Nachricht');
    const input = new TextInputBuilder().setCustomId('message').setLabel('Nachricht').setStyle(TextInputStyle.Paragraph).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  } else if (action === 'settime') {
    const modal = new ModalBuilder().setCustomId(`settime_modal_${guildId}`).setTitle('Zeit setzen');
    const input = new TextInputBuilder().setCustomId('hour').setLabel('Stunde (0-23, day, night)').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  } else if (action === 'kick' || action === 'ban' || action === 'ipban') {
    const players = await playerService.getOnlinePlayers(server);
    const playerSelect = new StringSelectMenuBuilder()
      .setCustomId(`${action}_player_${guildId}`)
      .setPlaceholder('Spieler auswählen...')
      .setMinValues(1)
      .setMaxValues(1);
    for (const player of players) {
      const userId = player.steamId || player.playerUid;
      playerSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(player.name).setValue(userId));
    }
    await interaction.update({ content: 'Wähle den Spieler:', components: [new ActionRowBuilder().addComponents(playerSelect)], ephemeral: true });
  } else if (action === 'shutdown') {
    const modal = new ModalBuilder().setCustomId(`shutdown_modal_${guildId}`).setTitle('Server herunterfahren');
    const secondsInput = new TextInputBuilder().setCustomId('seconds').setLabel('Sekunden').setStyle(TextInputStyle.Short).setValue('60').setRequired(true);
    const messageInput = new TextInputBuilder().setCustomId('message').setLabel('Nachricht').setStyle(TextInputStyle.Paragraph).setValue('Server wird heruntergefahren.').setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(secondsInput), new ActionRowBuilder().addComponents(messageInput));
    await interaction.showModal(modal);
  } else if (action === 'givecoins') {
    const players = await playerService.getOnlinePlayers(server);
    const playerSelect = new StringSelectMenuBuilder()
      .setCustomId(`givecoins_player_${guildId}`)
      .setPlaceholder('Spieler auswählen...')
      .setMinValues(1)
      .setMaxValues(1);
    for (const player of players) {
      const userId = player.steamId || player.playerUid;
      playerSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(player.name).setValue(userId));
    }
    await interaction.update({ content: 'Wähle den Spieler:', components: [new ActionRowBuilder().addComponents(playerSelect)], ephemeral: true });
  } else if (action === 'whitelist_get') {
    const result = await rconCommands.whitelistGet(server);
    await interaction.reply({ content: result.success ? result.response || 'Whitelist abgerufen.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  }
}

async function handleAdminPlayerSelect(interaction, action, guildId) {
  const userId = interaction.values[0];
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  if (action === 'kick') {
    const result = await rconCommands.kickPlayer(server, userId, 'Kicked by Discord Admin.');
    await interaction.reply({ content: result.success ? '✅ Spieler gekickt.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (action === 'ban') {
    const result = await rconCommands.banPlayer(server, userId, 'Banned by Discord Admin.');
    await interaction.reply({ content: result.success ? '✅ Spieler gebannt.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (action === 'ipban') {
    const result = await rconCommands.ipBanPlayer(server, userId, 'IP Banned by Discord Admin.');
    await interaction.reply({ content: result.success ? '✅ Spieler IP-gebannt.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  }
}

async function handleModalSubmit(interaction, guildId) {
  const customId = interaction.customId;
  const server = guildService.getActiveServer(guildId);
  if (!server) return;

  if (customId.startsWith('broadcast_modal_')) {
    const message = interaction.fields.getTextInputValue('message');
    const result = await rconCommands.broadcast(server, message);
    await interaction.reply({ content: result.success ? '✅ Broadcast gesendet.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (customId.startsWith('settime_modal_')) {
    const hour = interaction.fields.getTextInputValue('hour');
    const result = await rconCommands.setTime(server, hour);
    await interaction.reply({ content: result.success ? `✅ Zeit auf ${hour} gesetzt.` : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (customId.startsWith('shutdown_modal_')) {
    const seconds = interaction.fields.getTextInputValue('seconds');
    const message = interaction.fields.getTextInputValue('message');
    const result = await rconCommands.shutdown(server, seconds, message);
    await interaction.reply({ content: result.success ? '✅ Shutdown eingeleitet.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (customId.startsWith('givecoins_modal_')) {
    const match = customId.match(/^givecoins_modal_(\d+)_(.+)$/);
    if (!match) return;
    const userId = match[2];
    const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
    playerService.addCoins(guildId, userId, amount);
    await interaction.reply({ content: `✅ ${amount} Coins an ${userId} gegeben.`, ephemeral: true });
  } else if (customId.startsWith('give_amount_')) {
    await handleGiveModal(interaction, customId, guildId);
  } else if (customId.startsWith('teleport_modal_')) {
    const targetUser = interaction.fields.getTextInputValue('target_user');
    const result = await rconCommands.teleportToPlayer(server, targetUser);
    await interaction.reply({ content: result.success ? '✅ Teleport ausgeführt.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (customId.startsWith('whitelist_modal_')) {
    const match = customId.match(/^whitelist_modal_(\d+)_(.+)$/);
    if (!match) return;
    const action = match[2];
    const userId = interaction.fields.getTextInputValue('user_id');
    let result;
    if (action === 'add') result = await rconCommands.whitelistAdd(server, userId);
    else result = await rconCommands.whitelistRemove(server, userId);
    await interaction.reply({ content: result.success ? '✅ Whitelist aktualisiert.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else if (customId.startsWith('base_modal_')) {
    await handleBaseModalSubmit(interaction, guildId);
  }
}

async function handleWhitelistAction(interaction, guildId) {
  const action = interaction.values[0];
  const server = guildService.getActiveServer(guildId);
  if (!server) return;
  if (action === 'get') {
    const result = await rconCommands.whitelistGet(server);
    await interaction.reply({ content: result.success ? result.response || 'Whitelist abgerufen.' : `❌ Fehler: ${result.error}`, ephemeral: true });
  } else {
    const modal = new ModalBuilder().setCustomId(`whitelist_modal_${guildId}_${action}`).setTitle(action === 'add' ? 'Whitelist hinzufügen' : 'Whitelist entfernen');
    const input = new TextInputBuilder().setCustomId('user_id').setLabel('UserId').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }
}

async function handleGivecoinsPlayer(interaction, guildId) {
  const userId = interaction.values[0];
  const modal = new ModalBuilder().setCustomId(`givecoins_modal_${guildId}_${userId}`).setTitle('Coins geben');
  const input = new TextInputBuilder().setCustomId('amount').setLabel('Anzahl Coins').setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

module.exports = async function interactionCreateHandler(client, interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const subcommand = interaction.options.getSubcommand();
      switch (subcommand) {
        case 'server': return await handlePalServer(interaction);
        case 'players': return await handlePalPlayers(interaction);
        case 'shop': return await handlePalShop(interaction);
        case 'balance': return await handlePalBalance(interaction);
        case 'give': return await handlePalGive(interaction);
        case 'admin': return await handlePalAdmin(interaction);
        case 'whitelist': return await handlePalWhitelist(interaction);
        case 'setup': return await handlePalSetup(interaction);
        case 'link': return await handlePalLink(interaction);
        case 'language': return await handlePalLanguage(interaction);
        case 'base': return await handlePalBase(interaction);
        case 'profile': return await handlePalProfile(interaction);
        case 'leaderboard': return await handlePalLeaderboard(interaction);
        case 'daily': return await handlePalDaily(interaction);
        case 'pay': return await handlePalPay(interaction);
        case 'basesetup': return await handlePalBasesetup(interaction);
        case 'chatbridge': return await handlePalChatbridge(interaction);
        case 'about': return await handlePalAbout(interaction);
      }
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;
      const match = customId.match(/^(playerlist|refresh_status|shop|base_add|bases_list|base_delete_start)_(\d+)$/);
      if (match) {
        const action = match[1];
        const guildId = match[2];
        if (action === 'playerlist') return await handlePlayerListButton(interaction, guildId);
        if (action === 'refresh_status') return await handleRefreshStatusButton(interaction, guildId);
        if (action === 'shop') return await handleShopButton(interaction, guildId);
        if (action === 'base_add') return await handleBaseAddButton(interaction, guildId);
        if (action === 'bases_list') return await baseEmbed.showBasesList(interaction, guildId, 0, true);
        if (action === 'base_delete_start') return await baseEmbed.showBaseDeleteUserSelect(interaction, guildId);
      }
      const basesPageMatch = customId.match(/^bases_(prev|next)_(\d+)_(\d+)$/);
      if (basesPageMatch) {
        const direction = basesPageMatch[1];
        const guildId = basesPageMatch[2];
        const page = parseInt(basesPageMatch[3], 10) + (direction === 'next' ? 1 : -1);
        const { embed, total } = baseEmbed.buildBasesEmbed(guildId, page);
        const components = total > 0 ? [baseEmbed.buildBasesButtons(guildId, page, Math.ceil(total / 10))] : [];
        await interaction.update({ embeds: [embed], components });
        return;
      }
      const shopMatch = customId.match(/^shop_(\d+)_(back|buy_(\d+))$/);
      if (shopMatch) {
        const guildId = shopMatch[1];
        if (shopMatch[2] === 'back') return await handleShopBack(interaction, guildId);
        return await handleShopBuy(interaction, customId, guildId);
      }
      const playerMatch = customId.match(/^player_(\d+)_(kick|givecoins|teleport)_(.+)$/);
      if (playerMatch) return await handlePlayerDetailButton(interaction, customId, playerMatch[1]);
    }

    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      const baseDeleteUser = customId.match(/^base_delete_user_(\d+)$/);
      if (baseDeleteUser) {
        const guildId = baseDeleteUser[1];
        const userId = interaction.values[0];
        return await baseEmbed.showBaseDeleteSelect(interaction, guildId, userId);
      }
      const baseDeleteConfirm = customId.match(/^base_delete_confirm_(\d+)$/);
      if (baseDeleteConfirm) {
        const guildId = baseDeleteConfirm[1];
        const baseId = parseInt(interaction.values[0], 10);
        const base = baseService.getBaseById(baseId, guildId);
        if (!base) {
          await interaction.reply({ content: '❌ Basis nicht gefunden.', ephemeral: true });
          return;
        }
        const isAdmin = interaction.member.permissions.has('Administrator') || guildService.isGuildAdmin(guildId, interaction.user.id);
        const player = db.prepare('SELECT * FROM players WHERE guild_id = ? AND discord_id = ?').get(guildId, interaction.user.id);
        if (!isAdmin && (!player || player.user_id !== base.user_id)) {
          await interaction.reply({ content: '❌ Nicht berechtigt.', ephemeral: true });
          return;
        }
        baseService.deleteBase(baseId, guildId, null);
        await baseEmbed.refreshBasesEmbed(interaction.client, guildId);
        await interaction.reply({ content: `✅ Basis **${base.name}** gelöscht.`, ephemeral: true });
        return;
      }
      const playerSelect = customId.match(/^player_select_(\d+)$/);
      if (playerSelect) return await handlePlayerSelect(interaction, playerSelect[1]);
      const playerPage = customId.match(/^playerlist_(\d+)_(prev|next)_(\d+)$/);
      if (playerPage) return await handlePlayerListPagination(interaction, customId, playerPage[1]);
      const shopCat = customId.match(/^shop_category_(\d+)$/);
      if (shopCat) return await handleShopCategory(interaction, shopCat[1]);
      const shopItem = customId.match(/^shop_item_(\d+)$/);
      if (shopItem) return await handleShopItem(interaction, shopItem[1]);
      const giveType = customId.match(/^give_type_(\d+)$/);
      if (giveType) return await handleGiveType(interaction, giveType[1]);
      const givePlayer = customId.match(/^give_player_(\d+)_(item|pal|egg|relic|techpoints|exp)$/);
      if (givePlayer) return await handleGivePlayer(interaction, customId, givePlayer[1]);
      const giveItem = customId.match(/^give_item_(\d+)_(item|pal|egg|relic|techpoints|exp)_(.+)$/);
      if (giveItem) return await handleGiveItem(interaction, customId, giveItem[1]);
      const adminAction = customId.match(/^admin_action_(\d+)$/);
      if (adminAction) return await handleAdminAction(interaction, adminAction[1]);
      const whitelistAction = customId.match(/^whitelist_action_(\d+)$/);
      if (whitelistAction) return await handleWhitelistAction(interaction, whitelistAction[1]);
      const adminPlayer = customId.match(/^(kick|ban|ipban)_player_(\d+)$/);
      if (adminPlayer) return await handleAdminPlayerSelect(interaction, adminPlayer[1], adminPlayer[2]);
      const givecoinsPlayer = customId.match(/^givecoins_player_(\d+)$/);
      if (givecoinsPlayer) return await handleGivecoinsPlayer(interaction, givecoinsPlayer[1]);
    }

    if (interaction.isModalSubmit()) {
      const guildId = customIdMatch(interaction.customId);
      if (guildId) return await handleModalSubmit(interaction, guildId);
    }
  } catch (err) {
    logger.error(`Interaction error: ${err.message}`);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `❌ Fehler: ${err.message}`, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: `❌ Fehler: ${err.message}`, ephemeral: true }).catch(() => {});
    }
  }
};

function customIdMatch(customId) {
  const match = customId.match(/_(\d+)$/);
  return match ? match[1] : null;
}
