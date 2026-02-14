import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Locale } from "./config";

export interface DbUser {
  telegramId: number;
  accessKeyId: string;
  locale: Locale;
}

export interface NotificationState {
  telegramId: number;
  lastPercent: number;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      access_key_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_state (
      telegram_id INTEGER PRIMARY KEY,
      last_percent INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function upsertUser(db: Database.Database, telegramId: number, accessKeyId: string, locale: Locale): void {
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, access_key_id, locale)
    VALUES (?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      access_key_id = excluded.access_key_id,
      locale = excluded.locale
  `);
  stmt.run(telegramId, accessKeyId, locale);
}

export function getUser(db: Database.Database, telegramId: number): DbUser | null {
  const row = db.prepare("SELECT telegram_id, access_key_id, locale FROM users WHERE telegram_id = ?").get(telegramId) as any;
  if (!row) return null;
  return {
    telegramId: row.telegram_id,
    accessKeyId: row.access_key_id,
    locale: row.locale as Locale
  };
}

export function listUsers(db: Database.Database): DbUser[] {
  const rows = db.prepare("SELECT telegram_id, access_key_id, locale FROM users").all() as any[];
  return rows.map((row) => ({
    telegramId: row.telegram_id,
    accessKeyId: row.access_key_id,
    locale: row.locale as Locale
  }));
}

export function getNotificationState(db: Database.Database, telegramId: number): NotificationState {
  const row = db.prepare("SELECT telegram_id, last_percent FROM notification_state WHERE telegram_id = ?").get(telegramId) as any;
  if (!row) {
    return { telegramId, lastPercent: 0 };
  }
  return { telegramId: row.telegram_id, lastPercent: Number(row.last_percent) };
}

export function upsertNotificationState(db: Database.Database, telegramId: number, lastPercent: number): void {
  const stmt = db.prepare(`
    INSERT INTO notification_state (telegram_id, last_percent, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(telegram_id) DO UPDATE SET
      last_percent = excluded.last_percent,
      updated_at = excluded.updated_at
  `);
  stmt.run(telegramId, lastPercent);
}

export function setLocale(db: Database.Database, telegramId: number, locale: Locale): void {
  const stmt = db.prepare("UPDATE users SET locale = ? WHERE telegram_id = ?");
  stmt.run(locale, telegramId);
}
