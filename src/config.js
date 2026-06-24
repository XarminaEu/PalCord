require('dotenv').config();

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'SESSION_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackUrl: process.env.DISCORD_CALLBACK_URL || 'http://localhost:5996/auth/discord/callback',
    inviteEnabled: process.env.DISCORD_INVITE_ENABLED === 'true',
    invitePermissions: process.env.DISCORD_INVITE_PERMISSIONS || '8',
  },
  paypal: {
    enabled: process.env.PAYPAL_ENABLED === 'true',
    url: process.env.PAYPAL_URL || process.env.PAYPAL_ADDRESS || '',
  },
  app: {
    port: parseInt(process.env.APP_PORT || '5996', 10),
    url: process.env.APP_URL || 'http://localhost:5996',
    sessionSecret: process.env.SESSION_SECRET,
  },
  database: {
    path: process.env.DB_PATH || './data/palcord.db',
  },
  globalAdminId: process.env.GLOBAL_ADMIN_ID || '1482263697131835413',
  logLevel: process.env.LOG_LEVEL || 'info',
  imprint: {
    name: process.env.IMPRINT_NAME || '',
    address: process.env.IMPRINT_ADDRESS || '',
    city: process.env.IMPRINT_CITY || '',
    country: process.env.IMPRINT_COUNTRY || '',
    email: process.env.IMPRINT_EMAIL || '',
    phone: process.env.IMPRINT_PHONE || '',
    vatId: process.env.IMPRINT_VAT_ID || '',
    businessRegistration: process.env.IMPRINT_BUSINESS_REGISTRATION || '',
    responsiblePerson: process.env.IMPRINT_RESPONSIBLE_PERSON || '',
    disclaimer: process.env.IMPRINT_DISCLAIMER || '',
    disclaimerEn: process.env.IMPRINT_DISCLAIMER_EN || '',
    platformLink: process.env.IMPRINT_PLATFORM_LINK || 'https://ec.europa.eu/consumers/odr/',
  },
};
