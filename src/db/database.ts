// 单例连接 + WAL + 建表

import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('mydiet.db').then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(SCHEMA_SQL);
      await ensureMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

// 增量列迁移（ALTER TABLE 重复执行会报错，用 PRAGMA table_info 判重保证幂等）
async function ensureMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(step_log)'
  );
  if (!cols.some((c) => c.name === 'source')) {
    await db.execAsync(
      "ALTER TABLE step_log ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';"
    );
  }
}

// 本地时间字符串 YYYY-MM-DD HH:mm:ss
export function nowString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 本地日期字符串 YYYY-MM-DD
export function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
