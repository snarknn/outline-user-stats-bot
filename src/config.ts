import dotenv from "dotenv";

dotenv.config();

export type Locale = "en" | "ru" | "zh" | "fa";

export type LogLevel = "ERROR" | "INFO" | "DEBUG";

export interface AppConfig {
  botToken: string;
  outlineApiUrl: string;
  dbPath: string;
  checkIntervalMs: number;
  defaultLocale: Locale;
  logLevel: LogLevel;
}

function getRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const defaultLocaleRaw = (process.env.DEFAULT_LOCALE || "en").toLowerCase();
  const defaultLocale: Locale = isLocale(defaultLocaleRaw) ? defaultLocaleRaw : "en";
  const logLevelRaw = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  const logLevel = logLevelRaw === "DEBUG" || logLevelRaw === "ERROR" ? logLevelRaw : "INFO";
  return {
    botToken: getRequired("BOT_TOKEN"),
    outlineApiUrl: getRequired("OUTLINE_API_URL").replace(/\/$/, ""),
    dbPath: "./data/bot.db",
    checkIntervalMs: Number(process.env.CHECK_INTERVAL_MS || 900000),
    defaultLocale,
    logLevel
  };
}

function isLocale(value: string): value is Locale {
  return value === "en" || value === "ru" || value === "zh" || value === "fa";
}
