import dotenv from "dotenv";

dotenv.config();

export type Locale = "ru" | "en";

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
  const defaultLocale = (process.env.DEFAULT_LOCALE || "ru") as Locale;
  const logLevelRaw = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  const logLevel = logLevelRaw === "DEBUG" || logLevelRaw === "ERROR" ? logLevelRaw : "INFO";
  return {
    botToken: getRequired("BOT_TOKEN"),
    outlineApiUrl: getRequired("OUTLINE_API_URL").replace(/\/$/, ""),
    dbPath: process.env.DB_PATH || "./data/bot.db",
    checkIntervalMs: Number(process.env.CHECK_INTERVAL_MS || 900000),
    defaultLocale: defaultLocale === "en" ? "en" : "ru",
    logLevel
  };
}
