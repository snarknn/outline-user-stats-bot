import { Telegraf } from "telegraf";
import { loadConfig, type Locale } from "./config";
import { t } from "./i18n";
import {
  getProfileByOutlineId,
  getStatusByTelegramId,
  initDb,
  linkTelegramToOutline,
  listLinkedUsageRows,
  refreshOutlineCache,
  setLocaleByTelegramId,
  type LinkedUsageRow
} from "./db";
import { OutlineClient } from "./outline";
import { createLogger } from "./logger";

function formatBytes(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i += 1;
  }
  if (units[i] === "MiB") {
    return `${Math.round(value)} ${units[i]}`;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

function detectLocale(langCode?: string): Locale | null {
  if (!langCode) return null;
  const normalized = langCode.toLowerCase();
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("fa")) return "fa";
  return "en";
}

function resolveLocale(
  langCode: string | undefined,
  stored: Locale | null | undefined,
  defaultLocale: Locale,
  hasLinkedRow: boolean
): Locale {
  if (stored) return stored;
  const detected = detectLocale(langCode);
  if (detected) return detected;
  return hasLinkedRow ? defaultLocale : "en";
}

function resolveStoredLocale(stored: Locale | null | undefined, fallback: Locale): Locale {
  return stored || fallback;
}

const WARNING_THRESHOLDS = [50, 60, 70, 80, 90];

function formatUpdatedAt(value: string, locale: Locale): string {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}

function intervalMinutes(checkIntervalMs: number): number {
  return Math.max(1, Math.round(checkIntervalMs / 60000));
}

function getUsageMessageFromCache(
  locale: Locale,
  usedBytes: number,
  limitBytes: number | null,
  updatedAt: string,
  checkIntervalMs: number
): string {
  const refreshRateText = t(locale, "statusRefreshRate", { minutes: intervalMinutes(checkIntervalMs) });
  if (!limitBytes || limitBytes <= 0) {
    return `${t(locale, "statusUsedNoLimit", { used: formatBytes(usedBytes) })}\n${t(locale, "statusAsOf", {
      updatedAt: formatUpdatedAt(updatedAt, locale)
    })}\n${refreshRateText}`;
  }

  const percent = ((usedBytes / limitBytes) * 100).toFixed(1);
  return `${t(locale, "statusOk", {
    used: formatBytes(usedBytes),
    limit: formatBytes(limitBytes),
    percent
  })}\n${t(locale, "statusAsOf", { updatedAt: formatUpdatedAt(updatedAt, locale) })}\n${refreshRateText}`;
}

async function syncOutlineSnapshot(
  outline: OutlineClient,
  db: ReturnType<typeof initDb>,
  logger: ReturnType<typeof createLogger>,
  defaultLocale: Locale,
  bot?: Telegraf
): Promise<void> {
  const linkedRows: LinkedUsageRow[] = listLinkedUsageRows(db);
  const previousByOutlineId: Map<string, LinkedUsageRow> = new Map(
    linkedRows.map((row: LinkedUsageRow): [string, LinkedUsageRow] => [row.outlineId, row])
  );

  const keys = await outline.listAccessKeys();
  const transferMap = await outline.getTransferMap();

  const snapshot = keys.map((key) => {
    const usedBytes = typeof transferMap[key.id] === "number" ? transferMap[key.id] : 0;
    const limitBytes = key.dataLimit?.bytes ?? null;
    const percentUsed = limitBytes && limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
    return {
      outlineId: key.id,
      limitBytes,
      usedBytes,
      percentUsed
    };
  });

  refreshOutlineCache(db, snapshot);

  if (!bot) return;

  for (const row of snapshot) {
    const prev: LinkedUsageRow | undefined = previousByOutlineId.get(row.outlineId);
    if (!prev) continue;
    if (!row.limitBytes || row.limitBytes <= 0) continue;

    const locale = resolveStoredLocale(prev.locale, defaultLocale);
    for (const threshold of WARNING_THRESHOLDS) {
      const crossed = prev.percentUsed < threshold && row.percentUsed >= threshold;
      if (crossed) {
        try {
          const warningKey = threshold >= 80 ? "warnHigh" : "warn";
          await bot.telegram.sendMessage(prev.telegramId, t(locale, warningKey, { percent: threshold }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error("Warning send failed", { telegramId: prev.telegramId, threshold, error: message });
        }
      }
    }

    const crossedToBlocked = prev.percentUsed < 100 && row.percentUsed >= 100;
    if (crossedToBlocked) {
      try {
        await bot.telegram.sendMessage(prev.telegramId, t(locale, "vpnBlocked"));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Blocked notification failed", { telegramId: prev.telegramId, error: message });
      }
    }

    const restoredBelowLimit = prev.percentUsed >= 100 && row.percentUsed < 100;
    if (restoredBelowLimit) {
      try {
        await bot.telegram.sendMessage(prev.telegramId, t(locale, "vpnRestored"));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Restored notification failed", { telegramId: prev.telegramId, error: message });
      }
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const db = initDb(config.dbPath);
  const outline = new OutlineClient(config.outlineApiUrl, logger);
  logger.info("Outline client configured", { baseUrl: config.outlineApiUrl });

  const bot = new Telegraf(config.botToken);

  try {
    await syncOutlineSnapshot(outline, db, logger, config.defaultLocale);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Initial snapshot sync failed", { error: message });
  }

  bot.start(async (ctx) => {
    const user = getStatusByTelegramId(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale, config.defaultLocale, Boolean(user));
    await ctx.reply(t(locale, "welcome"));
    await ctx.reply(t(locale, "help"));
    await ctx.reply(t(locale, "helpDetails"));
  });

  bot.command("status", async (ctx) => {
    let user = getStatusByTelegramId(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale, config.defaultLocale, Boolean(user));

    try {
      if (!user) {
        await syncOutlineSnapshot(outline, db, logger, config.defaultLocale);
        user = getStatusByTelegramId(db, ctx.from.id);
      }

      if (!user) {
        await ctx.reply(t(locale, "statusNoKey"));
        return;
      }

      const usedBytes = user.usedBytes ?? 0;
      const msg = getUsageMessageFromCache(locale, usedBytes, user.limitBytes, user.updatedAt, config.checkIntervalMs);
      await ctx.reply(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Status command failed", { error: message });
      await ctx.reply(t(locale, "outlineApiError"));
    }
  });

  bot.command("lang", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const requested = parts[1]?.toLowerCase();
    if (!requested || !isLocale(requested)) {
      const current = getStatusByTelegramId(db, ctx.from.id);
      const locale = resolveLocale(ctx.from?.language_code, current?.locale, config.defaultLocale, Boolean(current));
      await ctx.reply(t(locale, "help"));
      return;
    }
    const locale: Locale = requested;
    const user = getStatusByTelegramId(db, ctx.from.id);
    if (!user) {
      await ctx.reply(t(locale, "statusNoKey"));
      return;
    }

    setLocaleByTelegramId(db, ctx.from.id, locale);
    await ctx.reply(t(locale, "langSet", { lang: locale }));
  });

  bot.command("help", async (ctx) => {
    const user = getStatusByTelegramId(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale, config.defaultLocale, Boolean(user));
    await ctx.reply(t(locale, "helpDetails"));
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const user = getStatusByTelegramId(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale, config.defaultLocale, Boolean(user));

    if (!text.startsWith("ss://")) {
      await ctx.reply(t(locale, "help"));
      return;
    }

    try {
      const accessKeyId = await outline.resolveAccessKeyIdFromSs(text);
      if (!accessKeyId) {
        await ctx.reply(t(locale, "outlineNoMatch"));
        return;
      }

      let keyRow = getProfileByOutlineId(db, accessKeyId);
      if (!keyRow) {
        await syncOutlineSnapshot(outline, db, logger, config.defaultLocale);
        keyRow = getProfileByOutlineId(db, accessKeyId);
      }

      if (!keyRow) {
        await ctx.reply(t(locale, "outlineNoMatch"));
        return;
      }

      linkTelegramToOutline(db, accessKeyId, ctx.from.id, locale);
      await ctx.reply(t(locale, "keyLinked"));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Key link failed", { error: message });
      await ctx.reply(t(locale, "outlineApiError"));
    }
  });

  const interval = config.checkIntervalMs;
  let pollInProgress = false;
  setInterval(async () => {
    if (pollInProgress) {
      logger.info("Polling tick skipped", { reason: "previous sync still running" });
      return;
    }

    pollInProgress = true;
    try {
      await syncOutlineSnapshot(outline, db, logger, config.defaultLocale, bot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Polling sync failed", { error: message });
    } finally {
      pollInProgress = false;
    }
  }, interval);

  await bot.launch();
  logger.info("Bot started");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

function isLocale(value: string): value is Locale {
  return value === "en" || value === "ru" || value === "zh" || value === "fa";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
