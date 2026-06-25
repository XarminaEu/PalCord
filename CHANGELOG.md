# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-06-25

### Added
- **Public Server View**: Added a public server listing at `/public` accessible without login.
  - Displays public Discord servers, their status, shop items, and rules.
  - Includes a bump feature to increase server visibility.
  - Added `public` and `bumps` columns to the `guilds` table.
  - Added public API endpoints for server info, shop, rules, status, and bumping.
- **Server Settings**: Added a toggle for admins to mark their server as public.
- **Global Admin Ban System**: System administrators can now ban Discord servers and users.
  - Added `banned` columns to `guilds` and `guild_users` tables.
  - Enforced bans in authentication, dashboard access control, and bot command handling.
  - Added ban/unban API endpoints and UI in the system view.
- **Modern Admin Dropdown**: Replaced the "System" tab with a dropdown menu for global admin functions.
- **Favicon**: Added a multi-resolution `favicon.ico` generated from the logo and served at `/favicon.ico`.
- **Version Numbers**: Added version display in the footer of the homepage and dashboard, an `/api/version` endpoint, and the bot's Discord activity status.
- **Homepage Link**: Added a link to the public server listing from the homepage.

### Changed
- Updated dashboard settings to register the guild before loading/saving the public flag to ensure the flag is persisted correctly.
- Renamed public toggle API payload field from `public` to `isPublic` to avoid JavaScript reserved word issues.

### Fixed
- Fixed null reference errors when `currentGuildData` was missing in the dashboard.
- Fixed JavaScript variable redeclaration error in `public.html` by removing a duplicate i18n script.
- Fixed favicon 404 by adding a dedicated route and versioned cache-busting links.

## [1.0.0] - 2026-06-22

### Added
- Initial release of PalCord.
- Discord bot and web dashboard for managing Palworld servers.
- Server management, RCON integration, shop, player tracking, bases, broadcasts, and economy system.
- SQLite database with user and guild management.
- Discord OAuth authentication.
- Multi-language support (German and English).
