# PalCord

PalCord is a Discord bot for Palworld servers with RCON integration, a web dashboard, SQLite database, scheduled broadcasts, admin tools, and a copyright protection system.

## Features

- **Multi-Tenant**: Each Discord guild can manage its own Palworld servers, shop, players, and admins.
- **Web Dashboard**: Discord OAuth login, server management, shop management, player overview, and admin actions.
- **Persistent Server Status Embed**: Auto-updating status embed per Discord guild.
- **Player List**: Level, playtime, player UID, Steam ID, and platform.
- **Shop System**: Coins, buy flow with RCON execution.
- **Admin Commands**: Give, kick, ban, IP ban, broadcast, set time, shutdown, whitelist.
- **Scheduled Broadcasts**: One-time or daily recurring broadcasts via RCON.
- **Chat Bridge**: Discord channel to in-game chat bridge.
- **Copyright Protection**: Remote copyright verification on startup.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your Discord credentials
npm run register
npm start
```

Open the dashboard at `http://your-domain:5996/`.

## Documentation

- [Installation Guide](install.md) - Step-by-step setup instructions.
- [Environment Variables](.env.example) - Example configuration.

## Important Notice

`.env` contains placeholders. **Before production use**, replace `DISCORD_CLIENT_SECRET`, `DISCORD_TOKEN`, and `SESSION_SECRET` with real values.
