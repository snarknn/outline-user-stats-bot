# Outline User Stats Bot

Telegram bot that shows Outline VPN traffic usage and notifies users when they pass 50% of their limit and each subsequent 10%.

## Requirements

- Node.js 18+
- Outline management API access

## API Reference

- Outline OpenAPI (source of truth for endpoint/field contracts): https://github.com/OutlineFoundation/outline-server/blob/master/src/shadowbox/server/api.yml

## How it works

- User sends `ss://...` key to the bot.
- Bot resolves Outline `access_key_id` from the key and links it with Telegram user in SQLite cache table.
- Data is stored in two normalized tables: `outline_profiles` (link + locale) and `outline_usage` (limits/traffic/percent cache).
- Every polling interval bot fetches Outline `access-keys` + `metrics/transfer` and refreshes cache.
- `/status` returns usage from cache with "data as of" timestamp (fallback: one immediate refresh if cache miss).
- If no limit is set, bot still shows consumed traffic.
- Warnings are sent at 50% and then every next 10% (60%, 70%, ...).
- Warning is sent when a threshold is crossed (e.g., from below 50% to 50%+).
- At 80% and above warning also explains that VPN becomes unavailable after 100%.
- When usage crosses to 100%+ bot sends that VPN is unavailable until usage drops below 100%.
- When usage drops below 100% again bot sends that VPN is available again.
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

- Docker Compose expects environment variables to be provided externally (shell/CI/secret store); `.env` is optional.
- For self-signed certs set `NODE_TLS_REJECT_UNAUTHORIZED=0` in environment.
- To use a custom host folder for the database, set `DATA_DIR` (defaults to `./data`).
- Build and run: `docker compose up -d --build`

## Commands

- `/start` - onboarding and plain-language help
- `/help` - explains status output, units, warnings, and the last-30-days moving period
- `/status` - show current usage
- `/lang en|ru|zh|fa` - set language

## Localization

- Bot auto-detects locale from Telegram `language_code` on first contact.
- If locale cannot be detected, bot defaults to English.
- User can always override language via `/lang en|ru|zh|fa`.
- Supported locales: `en`, `ru`, `zh`, `fa`.

## Env vars

- `BOT_TOKEN`
- `OUTLINE_API_URL` (full management URL with key, e.g. `https://host:8080/<api-key>`)
- `CHECK_INTERVAL_MS`
- `DEFAULT_LOCALE` (default: `en`)
- `LOG_LEVEL` (`ERROR` | `INFO` | `DEBUG`)

## Logging

- `LOG_LEVEL=DEBUG` enables full Outline request/response payload logs.
- Error logs include network/fetch details (`name`, `code`, `cause`, `stack`).
