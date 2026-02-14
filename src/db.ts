import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Locale } from "./config";

export interface OutlineUsageSnapshotItem {
  outlineId: string;
  limitBytes: number | null;
  usedBytes: number;
  percentUsed: number;
}

export interface StatusRow {
  outlineId: string;
  telegramId: number;
  locale: Locale | null;
  limitBytes: number | null;
  usedBytes: number;
  percentUsed: number;
  updatedAt: string;
}

export interface LinkedUsageRow {
  outlineId: string;
  telegramId: number;
  locale: Locale | null;
  percentUsed: number;
  limitBytes: number | null;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS outline_profiles (
      outline_id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE,
      locale TEXT,
      linked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outline_usage (
      outline_id TEXT PRIMARY KEY,
      limit_bytes INTEGER,
      used_bytes INTEGER NOT NULL DEFAULT 0,
      percent_used REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (outline_id) REFERENCES outline_profiles(outline_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_outline_profiles_telegram_id ON outline_profiles (telegram_id);
  `);

  const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='outline_users'").get() as
    | { name: string }
    | undefined;

  if (oldTable) {
    db.exec(`
      INSERT OR IGNORE INTO outline_profiles (outline_id, telegram_id, locale)
      SELECT outline_id, telegram_id, locale FROM outline_users;

      INSERT OR REPLACE INTO outline_usage (outline_id, limit_bytes, used_bytes, percent_used, updated_at)
      SELECT
        outline_id,
        limit_bytes,
        COALESCE(used_bytes, 0),
        COALESCE(percent_used, 0),
        COALESCE(updated_at, datetime('now'))
      FROM outline_users;

      DROP TABLE outline_users;
    `);
  }

  return db;
}

export function refreshOutlineCache(db: Database.Database, items: OutlineUsageSnapshotItem[]): void {
  const insertProfileStmt = db.prepare("INSERT OR IGNORE INTO outline_profiles (outline_id) VALUES (?)");
  const upsertUsageStmt = db.prepare(`
    INSERT INTO outline_usage (outline_id, limit_bytes, used_bytes, percent_used, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(outline_id) DO UPDATE SET
      limit_bytes = excluded.limit_bytes,
      used_bytes = excluded.used_bytes,
      percent_used = excluded.percent_used,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((rows: OutlineUsageSnapshotItem[]) => {
    for (const row of rows) {
      insertProfileStmt.run(row.outlineId);
      upsertUsageStmt.run(row.outlineId, row.limitBytes, row.usedBytes, row.percentUsed);
    }

    if (rows.length === 0) {
      db.prepare("DELETE FROM outline_usage").run();
      db.prepare("DELETE FROM outline_profiles").run();
      return;
    }

    const keepIds = rows.map((row) => row.outlineId);
    const placeholders = keepIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM outline_usage WHERE outline_id NOT IN (${placeholders})`).run(...keepIds);
    db.prepare(`DELETE FROM outline_profiles WHERE outline_id NOT IN (${placeholders})`).run(...keepIds);
  });

  tx(items);
}

export function getStatusByTelegramId(db: Database.Database, telegramId: number): StatusRow | null {
  const row = db
    .prepare(`
      SELECT
        u.outline_id AS outline_id,
        p.telegram_id AS telegram_id,
        p.locale AS locale,
        u.limit_bytes AS limit_bytes,
        u.used_bytes AS used_bytes,
        u.percent_used AS percent_used,
        u.updated_at AS updated_at
      FROM outline_profiles p
      JOIN outline_usage u ON u.outline_id = p.outline_id
      WHERE p.telegram_id = ?
      LIMIT 1
    `)
    .get(telegramId) as any;

  if (!row) return null;

  return {
    outlineId: row.outline_id,
    telegramId: row.telegram_id,
    locale: (row.locale as Locale | undefined) ?? null,
    limitBytes: row.limit_bytes === null ? null : Number(row.limit_bytes),
    usedBytes: Number(row.used_bytes || 0),
    percentUsed: Number(row.percent_used || 0),
    updatedAt: row.updated_at
  };
}

export function listLinkedUsageRows(db: Database.Database): LinkedUsageRow[] {
  const rows = db
    .prepare(`
      SELECT
        u.outline_id AS outline_id,
        p.telegram_id AS telegram_id,
        p.locale AS locale,
        u.percent_used AS percent_used,
        u.limit_bytes AS limit_bytes
      FROM outline_usage u
      JOIN outline_profiles p ON p.outline_id = u.outline_id
      WHERE p.telegram_id IS NOT NULL
    `)
    .all() as any[];

  return rows.map((row) => ({
    outlineId: row.outline_id,
    telegramId: Number(row.telegram_id),
    locale: (row.locale as Locale | undefined) ?? null,
    percentUsed: Number(row.percent_used || 0),
    limitBytes: row.limit_bytes === null ? null : Number(row.limit_bytes)
  }));
}

export function getProfileByOutlineId(db: Database.Database, outlineId: string): { outlineId: string } | null {
  const row = db.prepare("SELECT outline_id FROM outline_profiles WHERE outline_id = ?").get(outlineId) as any;
  if (!row) return null;
  return { outlineId: row.outline_id };
}

export function linkTelegramToOutline(db: Database.Database, outlineId: string, telegramId: number, locale: Locale): void {
  const clearStmt = db.prepare("UPDATE outline_profiles SET telegram_id = NULL WHERE telegram_id = ? AND outline_id <> ?");
  const upsertStmt = db.prepare(`
    INSERT INTO outline_profiles (outline_id, telegram_id, locale, linked_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(outline_id) DO UPDATE SET
      telegram_id = excluded.telegram_id,
      locale = excluded.locale
  `);

  const tx = db.transaction(() => {
    clearStmt.run(telegramId, outlineId);
    upsertStmt.run(outlineId, telegramId, locale);
  });

  tx();
}

export function setLocaleByTelegramId(db: Database.Database, telegramId: number, locale: Locale): void {
  const stmt = db.prepare("UPDATE outline_profiles SET locale = ? WHERE telegram_id = ?");
  stmt.run(locale, telegramId);
}
