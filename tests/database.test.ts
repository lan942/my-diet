// database.ts 行为单测：初始化/WAL、迁移幂等、失败复位、事务边界、恢复/重置
// expo-sqlite 在 node 环境不可用，使用记录调用序列的最小假实现

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from '../src/db/schema';
import type { BackupData } from '../src/types';

const openMock = vi.mocked(SQLite.openDatabaseAsync);

interface MockDb {
  execAsync: ReturnType<typeof vi.fn>;
  runAsync: ReturnType<typeof vi.fn>;
  getAllAsync: ReturnType<typeof vi.fn>;
  withTransactionAsync: ReturnType<typeof vi.fn>;
}

function makeMockDb(tableCols: {
  step: { name: string }[];
  food: { name: string }[];
}): MockDb {
  const execAsync = vi.fn(async () => undefined);
  const runAsync = vi.fn(async () => ({ lastInsertRowId: 1 }));
  const getAllAsync = vi.fn(async (sql: string) => {
    if (sql.includes('step_log')) return tableCols.step;
    if (sql.includes('food_item')) return tableCols.food;
    return [];
  });
  const withTransactionAsync = vi.fn(async (fn: () => Promise<void>) => {
    await fn();
  });
  return { execAsync, runAsync, getAllAsync, withTransactionAsync };
}

// 每个用例重置模块单例（dbPromise）与 mock
async function freshDatabase() {
  vi.resetModules();
  return import('../src/db/database');
}

const OLD_STEP_COLS: { name: string }[] = [{ name: 'id' }, { name: 'date' }];
const OLD_FOOD_COLS: { name: string }[] = [
  { name: 'id' },
  { name: 'name' },
  { name: 'category_id' },
];
const NEW_STEP_COLS = [...OLD_STEP_COLS, { name: 'steps' }, { name: 'source' }];
const NEW_FOOD_COLS = [
  ...OLD_FOOD_COLS,
  { name: 'name_en' },
  { name: 'notes_en' },
  { name: 'portions' },
];

beforeEach(() => {
  openMock.mockReset();
});

describe('getDb 初始化', () => {
  it('WAL pragma + SCHEMA_SQL 按序执行', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    await mod.getDb();

    expect(db.execAsync).toHaveBeenNthCalledWith(1, 'PRAGMA journal_mode = WAL;');
    expect(db.execAsync).toHaveBeenNthCalledWith(2, SCHEMA_SQL);
  });

  it('旧库缺列：幂等补齐 source/name_en/notes_en/portions 四条 ALTER', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: OLD_STEP_COLS, food: OLD_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    await mod.getDb();

    const sqls = db.execAsync.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes('ALTER TABLE step_log ADD COLUMN source'))).toBe(true);
    expect(sqls.some((s) => s.includes('ALTER TABLE food_item ADD COLUMN name_en'))).toBe(true);
    expect(sqls.some((s) => s.includes('ALTER TABLE food_item ADD COLUMN notes_en'))).toBe(true);
    expect(sqls.some((s) => s.includes('ALTER TABLE food_item ADD COLUMN portions'))).toBe(true);
  });

  it('已迁移库：不重复执行 ALTER（幂等）', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    await mod.getDb();

    const sqls = db.execAsync.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes('ALTER TABLE'))).toBe(false);
  });

  it('连接单例：重复 getDb 只打开一次', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    const [a, b] = await Promise.all([mod.getDb(), mod.getDb()]);
    expect(a).toBe(b);
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it('打开失败后 promise 复位：再次 getDb 重新打开并成功', async () => {
    const mod = await freshDatabase();
    openMock.mockRejectedValueOnce(new Error('disk i/o'));
    await expect(mod.getDb()).rejects.toThrow('disk i/o');

    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValueOnce(db as never);
    const reopened = await mod.getDb();
    expect(reopened).toBe(db);
    expect(openMock).toHaveBeenCalledTimes(2);
  });
});

describe('resetAllData', () => {
  it('清空 + 配置写入 + seed 回调全部发生在同一事务内', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);
    const seed = vi.fn(async () => undefined);

    await mod.resetAllData('{"onboarded":false}', seed);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.execAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM intake_log'));
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['main', '{"onboarded":false}']
    );
    expect(seed).toHaveBeenCalledTimes(1);
    expect(seed).toHaveBeenCalledWith(db);
  });
});

describe('withReaderTransaction', () => {
  it('回调结果透传，且在事务外壳内执行', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    const result = await mod.withReaderTransaction(async () => ({ ok: 42 }));

    expect(result).toEqual({ ok: 42 });
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
  });
});

describe('restoreAllData', () => {
  it('分类/食物/步数/摄入/配置按序插入同一事务', async () => {
    const mod = await freshDatabase();
    const db = makeMockDb({ step: NEW_STEP_COLS, food: NEW_FOOD_COLS });
    openMock.mockResolvedValue(db as never);

    const data: BackupData = {
      version: 1,
      exportedAt: '',
      config: { onboarded: true } as BackupData['config'],
      food_categories: [{ id: 7, name: '蛋白质', sort_order: 2 }],
      food_items: [],
      step_logs: [{ id: 3, date: '2026-10-11', steps: 100, source: 'manual', created_at: null }],
      intake_logs: [],
    };

    await mod.restoreAllData(data);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT INTO food_category (id, name, sort_order) VALUES (?, ?, ?)',
      [7, '蛋白质', 2]
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT INTO step_log (id, date, steps, source, created_at) VALUES (?, ?, ?, ?, ?)',
      [3, '2026-10-11', 100, 'manual', null]
    );
    // 配置落库的是 JSON 序列化字符串
    const configCall = db.runAsync.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('app_config')
    );
    expect(configCall?.[1]).toEqual(['main', JSON.stringify(data.config)]);
  });
});
