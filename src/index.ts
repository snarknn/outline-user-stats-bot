import { Telegraf } from "telegraf";
import { loadConfig, type Locale } from "./config";
import { t } from "./i18n";
import { initDb, getUser, listUsers, upsertUser, getNotificationState, upsertNotificationState, setLocale } from "./db";
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

function detectLocale(langCode?: string): Locale {
  if (!langCode) return "en";
  const normalized = langCode.toLowerCase();
  return normalized.startsWith("ru") ? "ru" : "en";
}

function resolveLocale(langCode: string | undefined, stored: Locale | undefined): Locale {
  if (stored) return stored;
  return detectLocale(langCode);
}

const WARNING_THRESHOLDS = [50, 60, 70, 80, 90, 100];

async function getUsageMessage(outline: OutlineClient, accessKeyId: string, locale: Locale): Promise<string> {
  const key = await outline.getAccessKey(accessKeyId);
  const usedBytes = await outline.getUsageBytes(accessKeyId);
  const limitBytes = key.dataLimit?.bytes;
  if (!limitBytes || limitBytes <= 0) {
    return t(locale, "statusUsedNoLimit", { used: formatBytes(usedBytes) });
  }
  const percent = ((usedBytes / limitBytes) * 100).toFixed(1);
  return t(locale, "statusOk", {
    used: formatBytes(usedBytes),
    limit: formatBytes(limitBytes),
    percent
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const db = initDb(config.dbPath);
  const outline = new OutlineClient(config.outlineApiUrl, logger);
  logger.info("Outline client configured", { baseUrl: config.outlineApiUrl });

  const bot = new Telegraf(config.botToken);

  bot.start(async (ctx) => {
    const user = getUser(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale);
    await ctx.reply(t(locale, "welcome"));
    await ctx.reply(t(locale, "help"));
    await ctx.reply(t(locale, "helpDetails"));
  });

  bot.command("status", async (ctx) => {
    const user = getUser(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale);
    if (!user || !user.accessKeyId) {
      await ctx.reply(t(locale, "statusNoKey"));
      return;
    }
    try {
      const msg = await getUsageMessage(outline, user.accessKeyId, locale);
      await ctx.reply(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Status command failed", { error: message });
      await ctx.reply(t(locale, "outlineApiError"));
    }
  });

  bot.command("lang", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const lang = parts[1] as Locale | undefined;
    const locale = lang === "en" ? "en" : "ru";
    const user = getUser(db, ctx.from.id);
    if (user) {
      setLocale(db, ctx.from.id, locale);
    } else {
      upsertUser(db, ctx.from.id, "", locale);
    }
    await ctx.reply(t(locale, "langSet", { lang: locale }));
  });

  bot.command("help", async (ctx) => {
    const user = getUser(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale);
    await ctx.reply(t(locale, "helpDetails"));
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const user = getUser(db, ctx.from.id);
    const locale = resolveLocale(ctx.from?.language_code, user?.locale);

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
      upsertUser(db, ctx.from.id, accessKeyId, locale);
      await ctx.reply(t(locale, "keyLinked"));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Key link failed", { error: message });
      await ctx.reply(t(locale, "outlineApiError"));
    }
  });

  const interval = config.checkIntervalMs;
  setInterval(async () => {
    const users = listUsers(db);
    for (const user of users) {
      if (!user.accessKeyId) continue;
      try {
        const key = await outline.getAccessKey(user.accessKeyId);
        const limitBytes = key.dataLimit?.bytes;
        if (!limitBytes || limitBytes <= 0) continue;

        const usedBytes = await outline.getUsageBytes(user.accessKeyId);
        const currentPercent = (usedBytes / limitBytes) * 100;
        const state = getNotificationState(db, user.telegramId);
        for (const threshold of WARNING_THRESHOLDS) {
          const crossed = state.lastPercent < threshold && currentPercent >= threshold;
          if (crossed) {
            await bot.telegram.sendMessage(user.telegramId, t(user.locale, "warn", { percent: threshold }));
          }
        }
        upsertNotificationState(db, user.telegramId, currentPercent);
      } catch {
        // Ignore user-specific errors during polling.
      }
    }
  }, interval);

  await bot.launch();
  logger.info("Bot started");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
