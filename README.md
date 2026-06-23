<div align="center">

# PalCord

[![Website](https://img.shields.io/badge/Website-palcord.run.place-5865F2?style=for-the-badge&logo=google-chrome&logoColor=white)](https://palcord.run.place/)
[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/developers/applications)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-57F287?style=for-the-badge)](LICENSE)

**Discord Bot & Web Dashboard for Palworld Servers**

RCON integration, SQLite database, scheduled broadcasts, admin tools, shop system, and a modern web dashboard.

[Live Demo](https://palcord.run.place/) · [Installation Guide](install.md) · [Environment Variables](.env.example)

</div>

---

## Features

| Feature | Description |
| --- | --- |
| **Multi-Tenant** | Each Discord guild manages its own Palworld servers, shop, players, and admins. |
| **Web Dashboard** | Discord OAuth login, server management, shop, player overview, and admin actions. |
| **Server Status Embed** | Auto-updating status embed per Discord guild. |
| **Player List** | Level, playtime, player UID, Steam ID, and platform. |
| **Shop System** | Coins, buy flow with direct RCON execution. |
| **Admin Commands** | Give, kick, ban, IP ban, broadcast, set time, shutdown, whitelist. |
| **Scheduled Broadcasts** | One-time or daily recurring broadcasts via RCON. |
| **Chat Bridge** | Discord channel to in-game chat bridge. |
| **Copyright Protection** | Remote copyright verification on startup. |

---

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your Discord credentials
npm run register
npm start
```

Open the dashboard at `http://your-domain:5996/` or use the public instance at **[https://palcord.run.place/](https://palcord.run.place/)**.

---

## Documentation

- **[Installation Guide](install.md)** - Step-by-step setup instructions.
- **[Run as a Service](service.md)** - Linux systemd and Windows service setup.
- **[Environment Variables](.env.example)** - Full configuration reference.

---

## Discord Application Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application.
3. Go to **OAuth2 → General** and add the redirect URL:
   ```
   http://your-domain:5996/auth/discord/callback
   ```
   *(Use your own domain or the public instance URL.)*
4. Copy `DISCORD_CLIENT_SECRET` into your `.env` file.
5. Under **General Information**, set:
   - **Terms of Service URL**: `http://your-domain:5996/terms`
   - **Privacy Policy URL**: `http://your-domain:5996/privacy`
   - **Interactions Endpoint URL**: leave empty (PalCord uses the Gateway bot)
   - **Linked Roles Verification URL**: leave empty (not used)

> If you use the public hosted version at **[https://palcord.run.place/](https://palcord.run.place/)**, use `https://palcord.run.place/auth/discord/callback` as redirect URL.

---

## Important Notice

`.env` contains placeholders. **Before production use**, replace `DISCORD_CLIENT_SECRET`, `DISCORD_TOKEN`, and `SESSION_SECRET` with real values.

---

## License

This project is licensed under the **PalCord Proprietary License**. See [LICENSE](LICENSE) for details.

**Summary:** You may use the Software for personal or internal purposes only. Modification, further development, redistribution, sublicensing, and further publication are **strictly prohibited**.
