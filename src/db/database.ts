// 单例连接 + WAL + 建表

import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import type { BackupData } from '../types';

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

  // 旧库 food_item 无 name_en/notes_en/portions 列（双语名称备注 + 生活化份量）
  const foodCols = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(food_item)'
  );
  if (!foodCols.some((c) => c.name === 'name_en')) {
    await db.execAsync('ALTER TABLE food_item ADD COLUMN name_en TEXT;');
  }
  if (!foodCols.some((c) => c.name === 'notes_en')) {
    await db.execAsync('ALTER TABLE food_item ADD COLUMN notes_en TEXT;');
  }
  if (!foodCols.some((c) => c.name === 'portions')) {
    await db.execAsync('ALTER TABLE food_item ADD COLUMN portions TEXT;');
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

// 仅清空摄入记录（单事务，失败回滚；不动步数/食物库/配置）
export async function clearIntakeLogs(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM intake_log;');
  });
}

// 清空全部业务表并写入指定配置（单事务，失败回滚；configJson 由调用方序列化，避免循环依赖）
export async function resetAllData(configJson: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM intake_log; DELETE FROM step_log; DELETE FROM food_item; DELETE FROM food_category;'
    );
    await db.runAsync('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [
      'main',
      configJson,
    ]);
  });
}

// 备份覆盖恢复（单事务，失败回滚；保留原 id 以维持 food_item_id 外键引用）
export async function restoreAllData(data: BackupData): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM intake_log; DELETE FROM step_log; DELETE FROM food_item; DELETE FROM food_category;'
    );
    for (const c of data.food_categories) {
      await db.runAsync(
        'INSERT INTO food_category (id, name, sort_order) VALUES (?, ?, ?)',
        [c.id, c.name, c.sort_order]
      );
    }
    for (const f of data.food_items) {
      await db.runAsync(
        `INSERT INTO food_item
         (id, name, name_en, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, notes_en, portions, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.id,
          f.name,
          f.name_en ?? null, // 旧版本备份无此字段
          f.category_id,
          f.kcal_per_100g,
          f.protein_per_100g,
          f.carb_per_100g,
          f.fat_per_100g,
          f.gi,
          f.notes,
          f.notes_en ?? null, // 旧版本备份无此字段
          Array.isArray(f.portions) ? JSON.stringify(f.portions) : null, // 备份内存态为数组，入库转 JSON 串
          f.updated_at,
        ]
      );
    }
    for (const s of data.step_logs) {
      await db.runAsync(
        'INSERT INTO step_log (id, date, steps, source, created_at) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.date, s.steps, s.source, s.created_at]
      );
    }
    for (const i of data.intake_logs) {
      await db.runAsync(
        'INSERT INTO intake_log (id, date, food_item_id, grams, meal, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [i.id, i.date, i.food_item_id, i.grams, i.meal, i.created_at]
      );
    }
    await db.runAsync('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [
      'main',
      JSON.stringify(data.config),
    ]);
  });
}
