const { EmbedBuilder } = require('discord.js');
const guildService = require('../../services/guildService');
const playerService = require('../../services/playerService');
const db = require('../../database/db');
const logger = require('../../logger');
const { t } = require('../../i18n');

function getLang(guildId) {
  return guildService.getGuildLanguage(guildId);
}

function __(guildId, key, replacements = {}) {
  return t(key, getLang(guildId), replacements);
}

async function handleGuildMemberAdd(member) {
  try {
    const guildId = member.guild.id;
    const welcomeChannelId = guildService.getServerConfig(guildId, 'welcome_channel_id');
    if (welcomeChannelId) {
      const channel = await member.client.channels.fetch(welcomeChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const message = __(guildId, 'welcome_message', { user: `<@${member.id}>` });
        await channel.send({ content: message }).catch(() => {});
      }
    }
    const autoRoleId = guildService.getServerConfig(guildId, 'auto_role_id');
    if (autoRoleId) {
      const role = await member.guild.roles.fetch(autoRoleId).catch(() => null);
      if (role && member.manageable) {
        await member.roles.add(role).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(`Guild member add error: ${err.message}`);
  }
}

const guildStatusState = new Map();

function getGuildStatusState(guildId) {
  if (!guildStatusState.has(guildId)) {
    guildStatusState.set(guildId, { wasOnline: null, players: new Set() });
  }
  return guildStatusState.get(guildId);
}

async function checkStatusNotifications(client, guildId, status) {
  const notificationChannelId = guildService.getServerConfig(guildId, 'notification_channel_id');
  if (!notificationChannelId) return;
  const channel = await client.channels.fetch(notificationChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const state = getGuildStatusState(guildId);
  const isOnline = !!status.isOnline;

  if (state.wasOnline !== null && state.wasOnline !== isOnline) {
    const embed = new EmbedBuilder()
      .setTitle(isOnline ? __(guildId, 'server_online_title') : __(guildId, 'server_offline_title'))
      .setDescription(`${status.name || 'Server'} - ${status.currentPlayers}/${status.maxPlayers} Spieler`)
      .setColor(isOnline ? 0x57f287 : 0xed4245);
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
  state.wasOnline = isOnline;

  if (!isOnline || !status.playerNames) return;

  const currentNames = new Set(status.playerNames);
  const previousNames = state.players;

  for (const name of currentNames) {
    if (!previousNames.has(name)) {
      await channel.send({ content: __(guildId, 'player_joined', { player: name }) }).catch(() => {});
    }
  }
  for (const name of previousNames) {
    if (!currentNames.has(name)) {
      await channel.send({ content: __(guildId, 'player_left', { player: name }) }).catch(() => {});
    }
  }
  state.players = currentNames;
}

async function sendDailyReminders(client) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const guilds = db.prepare('SELECT DISTINCT guild_id FROM players').all();
    for (const { guild_id: guildId } of guilds) {
      const reminderChannelId = guildService.getServerConfig(guildId, 'daily_reminder_channel_id');
      if (!reminderChannelId) continue;
      const channel = await client.channels.fetch(reminderChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;
      const players = db.prepare('SELECT user_id, discord_id FROM players WHERE guild_id = ?').all(guildId);
      const playersToRemind = players.filter(p => {
        const lastDaily = guildService.getServerConfig(guildId, `daily_${p.user_id}`);
        return lastDaily !== today;
      });
      for (const { discord_id: discordId } of playersToRemind) {
        const member = await channel.guild.members.fetch(discordId).catch(() => null);
        if (!member) continue;
        await channel.send({ content: `<@${discordId}> ${__(guildId, 'daily_reminder')}` }).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(`Daily reminder error: ${err.message}`);
  }
}

function startDailyReminderScheduler(client) {
  // Run once per day at 20:00
  const now = new Date();
  const next20 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0);
  if (next20 <= now) next20.setDate(next20.getDate() + 1);
  const msUntilNext = next20 - now;
  setTimeout(() => {
    sendDailyReminders(client);
    setInterval(() => sendDailyReminders(client), 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

module.exports = {
  handleGuildMemberAdd,
  checkStatusNotifications,
  sendDailyReminders,
  startDailyReminderScheduler,
};
