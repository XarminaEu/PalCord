const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const config = require('../config');
const guildService = require('../services/guildService');
const logger = require('../logger');

passport.serializeUser((user, done) => {
  done(null, JSON.stringify(user));
});

passport.deserializeUser((data, done) => {
  try {
    const user = JSON.parse(data);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new DiscordStrategy({
  clientID: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  callbackURL: config.discord.callbackUrl,
  scope: ['identify', 'guilds'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    logger.info(`Discord OAuth profile: id=${profile.id}, guilds=${Array.isArray(profile.guilds) ? profile.guilds.length : 'none'}`);
    if (Array.isArray(profile.guilds) && profile.guilds.length > 0) {
      logger.info(`First guild: ${JSON.stringify(profile.guilds[0])}`);
    }
    const allowedGuilds = (profile.guilds || []).filter(g => !guildService.isGuildBanned(g.id));
    const user = {
      id: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      guilds: allowedGuilds,
    };
    if (user.id !== config.globalAdminId && allowedGuilds.length === 0) {
      return done(null, false, { message: 'Account or servers are banned.' });
    }
    logger.info(`Discord OAuth login: ${user.username} (${user.id}), guilds: ${user.guilds.length}`);
    return done(null, user);
  } catch (err) {
    logger.error(`Discord OAuth strategy error: ${err.message || err}`);
    return done(err, null);
  }
}));

module.exports = passport;
