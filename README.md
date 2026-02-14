# Outline User Stats Bot

Telegram bot that shows Outline VPN traffic usage and notifies users when they pass 50% of their limit and each subsequent 10%.

## Requirements
- Node.js 18+
- Outline management API access

## How it works
- User sends `ss://...` key to the bot.
- Bot resolves Outline `access_key_id` from the key and saves mapping `telegram_id ↔ access_key_id` in SQLite.
- `/status` returns current usage and limit (if configured in Outline).
- If no limit is set, bot still shows consumed traffic.
- Warnings are sent at 50% and then every next 10% (60%, 70%, ...).
- Warning is sent when a threshold is crossed (e.g., from below 50% to 50%+).
- Usage values are shown for the last 30 days (a moving period recalculated daily), not a calendar month.

## Units and formatting
- To match Outline Manager values, traffic scaling uses decimal base 1000.
- Units shown: `B`, `KiB`, `MiB`, `GiB`, `TiB`.
- `MiB` values are rounded to integer for readability.

## Setup
1. Copy `.env.example` to `.env` and fill values (`OUTLINE_API_URL` must include API key in path).
2. Install dependencies: `npm install`
3. If Outline uses a self-signed certificate, set `NODE_TLS_REJECT_UNAUTHORIZED=0` before start.
4. Run in dev: `npm run dev`
5. Build: `npm run build`
6. Start: `npm start`

PowerShell example:
- `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"`
- `npm run dev`

## Docker
- For self-signed certs add `NODE_TLS_REJECT_UNAUTHORIZED=0` in `docker-compose.yml` environment.
- Build and run: `docker compose up -d --build`

## Commands
- `/start` - onboarding and plain-language help
- `/help` - explains status output, units, warnings, and the last-30-days moving period
- `/status` - show current usage
- `/lang ru|en` - set language

## Localization
- Bot auto-detects locale from Telegram `language_code` on first contact.
- If locale cannot be detected, bot defaults to English.
- User can always override language via `/lang ru|en`.

## Env vars
- `BOT_TOKEN`
- `OUTLINE_API_URL` (full management URL with key, e.g. `https://host:8080/<api-key>`)
- `DB_PATH`
- `CHECK_INTERVAL_MS`
- `DEFAULT_LOCALE`
- `LOG_LEVEL` (`ERROR` | `INFO` | `DEBUG`)

## Logging
- `LOG_LEVEL=DEBUG` enables full Outline request/response payload logs.
- Error logs include network/fetch details (`name`, `code`, `cause`, `stack`).
