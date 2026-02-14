# Project Knowledge (AGENTS)

## Purpose
Telegram bot that links a user’s Outline VPN access key to their Telegram account, shows traffic usage on demand, and sends warnings after 50% usage and each next 10%.

## Stack
- Node.js 18+
- TypeScript
- Telegraf
- SQLite (better-sqlite3)
- Docker (optional deployment)

## Key Files
- [src/index.ts](src/index.ts): bot entry, commands, polling warnings
- [src/outline.ts](src/outline.ts): Outline API client and ss:// parser
- [src/db.ts](src/db.ts): SQLite schema and helpers
- [src/config.ts](src/config.ts): env config loader
- [src/i18n.ts](src/i18n.ts): RU/EN strings
- [requirements.md](requirements.md): technical specification

## Outline API Integration
- Auth is part of URL path already included in `OUTLINE_API_URL` (e.g. `https://host:8080/<api-key>`)
- `GET /access-keys` for list of keys
- `GET /access-keys/{id}` for data limit
- `GET /metrics/transfer` for usage map (bytesTransferredByUserId)
- Access key ID resolved by matching password from `ss://` against Outline key password
- `ss://` parser supports query suffixes like `?outline=1`

## Data Model
- `users`: telegram_id, access_key_id, locale
- `notification_state`: telegram_id, last_percent

## Behavior Notes
- `/start`: greeting, command list, and plain-language help details
- `/help`: explains status output, units, warnings, and the last-30-days moving period
- `/status`: usage report
- `/lang ru|en`: set locale
- Text `ss://...`: link to Outline access key
- Warnings: start at 50%, then each 10% increment
- Warnings are triggered on threshold crossing (<50 -> >=50, <60 -> >=60, etc.)
- If no limit is set, `/status` still shows consumed traffic
- Polling warnings are skipped when no limit is set
- Locale is auto-detected from Telegram `language_code` on first contact, with fallback to `en` and manual override via `/lang`
- Traffic display uses decimal base (1000) to align with Outline Manager values
- Units shown as `B`, `KiB`, `MiB`, `GiB`, `TiB`; `MiB` values are rounded to integer

## Env Vars
- BOT_TOKEN
- OUTLINE_API_URL
- DB_PATH
- CHECK_INTERVAL_MS
- DEFAULT_LOCALE
- LOG_LEVEL (`ERROR` | `INFO` | `DEBUG`)

## Deployment
- Local dev: `npm run dev`
- Docker: `docker compose up -d --build`
- For self-signed Outline TLS certs, set `NODE_TLS_REJECT_UNAUTHORIZED=0` externally (shell or compose env), not in app config

## Logging Notes
- At `LOG_LEVEL=DEBUG`, bot logs full Outline request/response payloads for troubleshooting
- Error logs include network/fetch error details (`name`, `code`, `cause`, `stack`)
