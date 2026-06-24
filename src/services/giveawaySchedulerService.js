const giveawayService = require('./giveawayService');
const guildService = require('./guildService');
const logger = require('../logger');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

async function endGiveaway(client, giveaway) {
  try {
    giveawayService.setStatus(giveaway.id, 'ended');
    const winners = giveawayService.drawWinners(giveaway.id);
    const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
    const channel = guild ? await guild.channels.fetch(giveaway.channel_id).catch(() => null) : null;
    const message = channel ? await channel.messages.fetch(giveaway.message_id).catch(() => null) : null;

    if (winners.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway beendet')
        .setDescription(`**${giveaway.prize}**\n\nLeider hat sich niemand angemeldet.`)
        .setColor(0x95a5a6)
        .setTimestamp();
      if (message) await message.edit({ embeds: [embed], components: [] });
      else if (channel) await channel.send({ embeds: [embed] });
      return;
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway beendet')
      .setDescription(`**${giveaway.prize}**\n\nGewinner: ${winnerMentions}\n\nEine private Nachricht wurde versendet und ein Ticket-Channel erstellt.`)
      .setColor(0x2ecc71)
      .setTimestamp();

    if (message) await message.edit({ embeds: [embed], components: [] });
    else if (channel) await channel.send({ embeds: [embed] });

    for (const winnerId of winners) {
      try {
        const user = await client.users.fetch(winnerId);
        await user.send(`🎉 Glückwunsch! Du hast **${giveaway.prize}** bei einem Giveaway auf **${guild?.name || 'einem Server'}** gewonnen. Ein Support-Channel wurde für dich erstellt, um die Ausgabe zu koordinieren.`);
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
              .setLabel('Giveaway verteilen')
              .setStyle(ButtonStyle.Success)
          );

          const ticketEmbed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Gewinner')
            .setDescription(`<@${winnerId}> hat **${giveaway.prize}** gewonnen.\n\nSobald der Preis im Spiel ausgegeben wurde, kann das Admin-Team diesen Button drücken.`)
            .setColor(0xe67e22);

          await ticketChannel.send({ content: `<@${winnerId}>`, embeds: [ticketEmbed], components: [distributeRow] });
          await ticketChannel.send(`<@${winnerId}> bitte warte hier auf ein Teammitglied. ${supportRoleId ? `<@&${supportRoleId}> ` : ''}${adminRoleId ? `<@&${adminRoleId}>` : ''}`);
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
