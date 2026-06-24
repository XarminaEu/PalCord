const giveawayService = require('./giveawayService');
const guildService = require('./guildService');
const { t } = require('../i18n');
const logger = require('../logger');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

async function endGiveaway(client, giveaway) {
  try {
    const lang = guildService.getGuildLanguage(giveaway.guild_id);
    const _ = (key, replacements = {}) => t(key, lang, replacements);
    giveawayService.setStatus(giveaway.id, 'ended');
    const winners = giveawayService.drawWinners(giveaway.id);
    const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
    const channel = guild ? await guild.channels.fetch(giveaway.channel_id).catch(() => null) : null;
    const message = channel ? await channel.messages.fetch(giveaway.message_id).catch(() => null) : null;

    if (winners.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 ' + _('giveaway_ended'))
        .setDescription(`**${giveaway.prize}**\n\n${_('giveaway_no_participants')}`)
        .setColor(0x95a5a6)
        .setTimestamp();
      if (message) await message.edit({ embeds: [embed], components: [] });
      else if (channel) await channel.send({ embeds: [embed] });
      return;
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    const embed = new EmbedBuilder()
      .setTitle('🎉 ' + _('giveaway_ended'))
      .setDescription(`**${giveaway.prize}**\n\n${_('giveaway_winners')}: ${winnerMentions}\n\n${_('giveaway_dm_and_ticket')}`)
      .setColor(0x2ecc71)
      .setTimestamp();

    if (message) await message.edit({ embeds: [embed], components: [] });
    else if (channel) await channel.send({ embeds: [embed] });

    for (const winnerId of winners) {
      try {
        const user = await client.users.fetch(winnerId);
        await user.send(_('giveaway_winner_dm', { prize: giveaway.prize, server: guild?.name || _('a_server') }));
      } catch (e) {
        logger.warn(`Could not DM giveaway winner ${winnerId}: ${e.message}`);
      }

      try {
        if (guild) {
          const supportRoleId = guildService.getServerConfig(giveaway.guild_id, 'support_role_id');
          const adminRoleId = guildService.getServerConfig(giveaway.guild_id, 'admin_role_id');
          const member = await guild.members.fetch(winnerId).catch(() => null);
          const permissionOverwrites = [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: winnerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ];
          if (supportRoleId) {
            permissionOverwrites.push({ id: supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
          }
          if (adminRoleId) {
            permissionOverwrites.push({ id: adminRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
          }
          const ticketChannel = await guild.channels.create({
            name: `giveaway-${giveaway.id}-${winnerId.slice(-4)}`,
            type: ChannelType.GuildText,
            parent: null,
            permissionOverwrites,
          });

          const ticketId = giveawayService.createTicket(giveaway.id, winnerId, ticketChannel.id);

          const distributeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`giveaway_distribute_${ticketId}`)
              .setLabel(_('giveaway_distribute_button'))
              .setStyle(ButtonStyle.Success)
          );

          const ticketEmbed = new EmbedBuilder()
            .setTitle('🎉 ' + _('giveaway_winner'))
            .setDescription(`<@${winnerId}> ${_('giveaway_won_prize', { prize: giveaway.prize })}\n\n${_('giveaway_distribute_hint')}`)
            .setColor(0xe67e22);

          await ticketChannel.send({ content: `<@${winnerId}>`, embeds: [ticketEmbed], components: [distributeRow] });
          await ticketChannel.send(_('giveaway_wait_support', { user: winnerId, supportRole: supportRoleId || '', adminRole: adminRoleId || '' }));
        }
      } catch (e) {
        logger.error(`Could not create giveaway ticket channel for winner ${winnerId}: ${e.message}`);
      }
    }
  } catch (err) {
    logger.error(`Error ending giveaway ${giveaway.id}: ${err.message}`);
  }
}

async function processGiveaways(client) {
  const pending = giveawayService.getPendingEndGiveaways();
  for (const giveaway of pending) {
    await endGiveaway(client, giveaway);
  }
}

function startScheduler(client) {
  setInterval(() => processGiveaways(client), 60000);
  processGiveaways(client);
  logger.info('Giveaway scheduler started');
}

module.exports = { startScheduler, processGiveaways, endGiveaway };
