# PalCord Installation Guide

This guide explains how to install and run PalCord on a Linux server.

## Requirements

- Node.js 18 or higher
- npm
- A Discord application with bot token
- A Palworld server with RCON enabled

## Step 1: Clone the Repository

```bash
git clone https://github.com/XarminaEu/PalCord.git
cd PalCord
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Create the Environment File

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Your Discord application client ID |
| `DISCORD_GUILD_ID` | Your test guild ID for development command registration |
| `DISCORD_CLIENT_SECRET` | Your Discord OAuth client secret |
| `DISCORD_CALLBACK_URL` | OAuth callback URL, e.g. `http://your-domain:5996/auth/discord/callback` |
| `APP_PORT` | Port for the web dashboard, default `5996` |
| `APP_URL` | Public URL of your dashboard |
| `SESSION_SECRET` | Long random string for session security |
| `DB_PATH` | Path to SQLite database, default `./data/palcord.db` |
| `GLOBAL_ADMIN_ID` | Discord user ID with full admin access |
| `LOG_LEVEL` | Logging level, default `info` |

## Step 4: Register Discord Slash Commands

```bash
npm run register
```

This registers the `/pal` commands with Discord.

## Step 5: Start the Bot

```bash
npm start
```

Or use the helper scripts:

```bash
./start.sh
./register.sh
```

## Step 6: Open the Dashboard

Visit `http://your-domain:5996/` in your browser.

Login with Discord. You will only see Discord guilds where you are a member and where the bot is also present.

## Discord Application Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application.
3. Go to **OAuth2 → General**.
4. Add your redirect URL:
   ```
   http://your-domain:5996/auth/discord/callback
   ```
5. Copy the `DISCORD_CLIENT_SECRET` into your `.env` file.
6. Under **General Information**, set:
   - **Terms of Service URL**: `https://palcord.run.place/terms`
   - **Privacy Policy URL**: `https://palcord.run.place/privacy`
   - **Interactions Endpoint URL**: leave empty (PalCord uses the Gateway bot)
   - **Linked Roles Verification URL**: leave empty (not used)

## Bot Permissions

When inviting the bot, enable these scopes:

- `bot`
- `applications.commands`

Bot permissions needed:

- Send Messages
- Read Messages / View Channels
- Embed Links
- Use External Emojis
- Manage Messages (optional, for status embeds)

## Palworld Server Configuration

Enable RCON on your Palworld server. The required settings are:

- RCON host and port
- RCON password
- REST API host and port (optional, falls back to RCON)

Add your server in the web dashboard under the **Server** tab.

## Data Files

Place the following JSON files in the `/Data` directory before the first start:

- `Data/itemdata.json` → imported into `items`
- `Data/paldata.json` → imported into `pals`
- `Data/techdata.json` → imported into `technologies`

These files are not included in the repository for copyright reasons.

## Updating

```bash
git pull
npm install
npm run register
./start.sh
```

## Security Notes

- Never commit `.env` or database files.
- Keep `SESSION_SECRET` secret.
- The bot will not start if the copyright verification fails.
- Only guild admins and the global admin can access admin functions.

## Troubleshooting

- **Bot does not start**: Check `palcord.log` for copyright verification errors.
- **Commands not showing**: Run `npm run register` again.
- **Dashboard not loading**: Check that `DISCORD_CALLBACK_URL` matches your OAuth redirect.
- **Database errors**: Delete `data/palcord.db` and restart to recreate it.

## License

PalCord Copyright 2026 RL-Dev.de. All rights reserved.
