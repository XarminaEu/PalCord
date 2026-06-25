const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const config = require('../config');
const logger = require('../logger');
const passport = require('../web/auth');
const { getLang, getTranslations, supportedLanguages, DEFAULT_LANG } = require('../web/i18n');
const copyrightService = require('../services/copyrightService');
const copyrightManagement = require('../services/copyrightManagementService');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, '..', 'web', 'views')));
app.get('/favicon.ico', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, '..', 'web', 'views', 'favicon.ico'));
});

app.post('/api/copyright-check', (req, res) => {
  const { api_key, program, copyright } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!api_key || !program || !copyright) {
    copyrightManagement.logCheck(api_key || '', program || '', copyright || '', ip, false, 'Missing fields');
    return res.status(400).json({ status: 'error', allowed: false, message: 'startet nicht' });
  }
  const banned = copyrightManagement.isBanned(api_key);
  if (banned) {
    copyrightManagement.logCheck(api_key, program, copyright, ip, false, 'API-Key gesperrt');
    return res.status(403).json({ reason: 'API-Key gesperrt' });
  }
  const result = copyrightService.checkCopyright(api_key, program, copyright);
  copyrightManagement.logCheck(api_key, program, copyright, ip, result.allowed, result.allowed ? null : 'Invalid');
  logger.info(`Copyright check: ${result.allowed ? 'allowed' : 'denied'} for ${program} from ${ip}`);
  res.status(result.allowed ? 200 : 403).json(result);
});

app.get('/api/lang', (req, res) => {
  const lang = getLang(req);
  res.json({ lang, supported: supportedLanguages, translations: getTranslations(lang) });
});

app.post('/api/lang', (req, res) => {
  const { lang } = req.body;
  if (supportedLanguages.includes(lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
    return res.json({ lang, translations: getTranslations(lang) });
  }
  res.status(400).json({ error: 'Unsupported language' });
});

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: config.app.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/discord', passport.authenticate('discord', { prompt: 'consent' }));
app.get('/auth/discord/callback',
  (req, res, next) => {
    passport.authenticate('discord', (err, user) => {
      if (err) {
        logger.error(`Discord OAuth callback error: ${err.message || err}`);
        const lang = getLang(req);
        const _ = (key) => t(key, lang);
        return res.status(500).send(`
          <!DOCTYPE html>
          <html lang="${lang}"><head><title>${_('oauth_error')}</title>
          <style>body{font-family:sans-serif;background:#1a1a2e;color:#fff;padding:2rem;text-align:center;} .box{background:#16213e;padding:2rem;border-radius:8px;max-width:600px;margin:0 auto;} .error{color:#ed4245;}</style>
          </head><body>
            <div class="box">
              <h1>${_('oauth_error')}</h1>
              <p class="error">${(err.message || err).toString().replace(/</g, '&lt;')}</p>
              <p>${_('oauth_secret_hint')}</p>
              <p><a href="/" style="color:#57f287;">${_('back_to_start')}</a></p>
            </div>
          </body></html>
        `);
      }
      if (!user) return res.redirect('/');
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          logger.error(`Session login error: ${loginErr.message || loginErr}`);
          return res.status(500).send('Login fehlgeschlagen.');
        }
        res.redirect('/dashboard');
      });
    })(req, res, next);
  }
);

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.use('/', require('../web/dashboard'));

app.use((err, req, res, next) => {
  const msg = err && err.message ? err.message : String(err || 'Unknown error');
  logger.error(`Web/API error: ${msg}`);
  res.status(500).json({ error: msg });
});

function start() {
  app.listen(config.app.port, '0.0.0.0', () => {
    logger.info(`PalCord web dashboard listening on http://0.0.0.0:${config.app.port}`);
  });
}

module.exports = {
  app,
  start,
};
