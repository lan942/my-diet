// stepService 单测：手动录入/清除与平台写入的 manual 优先级规则
// expo-sqlite 在 node 环境不可用，使用内存行数组的最小假实现

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-18 12:00:00',
  todayString: () => '2026-10-18',
}));

import * as dbMod from '../src/db/database';
import {
  recordPlatformSteps,
  recordManualSteps,
  clearStepRecord,
  MAX_MANUAL_STEPS,
} from '../src/services/stepService';
import { BizError, ERR } from '../src/services/errors';
import type { StepLog } from '../src/types';

const getDbMock = vi.mocked(dbMod.getDb);

interface MemRow {
  id: number;
  date: string;
  steps: number;
  source: string | null;
  created_at: string | null;
}

function makeDb(initial: MemRow[] = []) {
  const rows = [...initial];
  let nextId = Math.max(0, ...initial.map((r) => r.id)) + 1;
  const runAsync = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith('UPDATE step_log')) {
      const [steps, source, time, id] = params as [number, string, string, number];
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.steps = steps;
        row.source = source;
        row.created_at = time;
      }
      return { changes: 1 };
    }
    if (sql.startsWith('INSERT INTO step_log')) {
      const [date, steps, source, time] = params as [string, number, string, string];
      const row: MemRow = {
        id: nextId++,
        date,
        steps,
        source,
        created_at: time,
      };
      rows.push(row);
      return { lastInsertRowId: row.id };
    }
    if (sql.startsWith('DELETE FROM step_log')) {
      const [date] = params as [string];
      const idx = rows.findIndex((r) => r.date === date);
      if (idx >= 0) rows.splice(idx, 1);
      return { changes: 1 };
    }
    return {};
  });
  const db = {
    execAsync: vi.fn(async () => undefined),
    runAsync,
    getAllAsync: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM step_log ORDER BY')) return [...rows];
      return [];
    }),
    getFirstAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT * FROM step_log WHERE date = ?')) {
        const [date] = params as [string];
        return rows.find((r) => r.date === date) ?? null;
      }
      return null;
    }),
    withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  };
  return { db, rows };
}

function platformRow(date: string, steps: number): MemRow {
  return { id: 1, date, steps, source: 'platform', created_at: null };
}

function manualRow(date: string, steps: number): MemRow {
  return { id: 1, date, steps, source: 'manual', created_at: null };
}

beforeEach(() => {
  getDbMock.mockReset();
});

describe('recordManualSteps 手动录入', () => {
  it('无记录日期：INSERT (date, steps, manual)', async () => {
    const { db, rows } = makeDb();
    getDbMock.mockResolvedValue(db as never);

    const result = await recordManualSteps('2026-10-18', 6000);

    expect(result).toMatchObject({
      date: '2026-10-18',
      steps: 6000,
      source: 'manual',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ steps: 6000, source: 'manual' });
  });

  it('覆盖 platform 行：更新为 manual 值（用户显式修正）', async () => {
    const { db, rows } = makeDb([platformRow('2026-10-15', 8800)]);
    getDbMock.mockResolvedValue(db as never);

    const result = await recordManualSteps('2026-10-15', 9500);

    expect(result).toMatchObject({ steps: 9500, source: 'manual' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ steps: 9500, source: 'manual' });
  });

  it.each([-1, 1.5, NaN, Infinity, MAX_MANUAL_STEPS + 1])(
    '%s 非法输入抛 ERR_INVALID_STEPS 且不写库',
    async (steps) => {
      const { db, rows } = makeDb();
      getDbMock.mockResolvedValue(db as never);

      await expect(recordManualSteps('2026-10-18', steps)).rejects.toMatchObject({
        name: 'BizError',
        code: ERR.INVALID_STEPS,
      });
      expect(rows).toHaveLength(0);
      expect(db.runAsync).not.toHaveBeenCalled();
    }
  );

  it('0 与 100000 边界放行', async () => {
    const { db } = makeDb();
    getDbMock.mockResolvedValue(db as never);

    const zero = await recordManualSteps('2026-10-18', 0);
    const max = await recordManualSteps('2026-10-18', MAX_MANUAL_STEPS);
    expect(zero.steps).toBe(0);
    expect(max.steps).toBe(MAX_MANUAL_STEPS);
  });
});

describe('recordPlatformSteps 跳过 manual 行', () => {
  it('命中 manual 行：不覆盖（8000 不被 6500 抹掉），返回既有行', async () => {
    const { db, rows } = makeDb([manualRow('2026-10-15', 8000)]);
    getDbMock.mockResolvedValue(db as never);

    const result = await recordPlatformSteps('2026-10-15', 6500);

    expect(result).toMatchObject({ steps: 8000, source: 'manual' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ steps: 8000, source: 'manual' });
    expect(db.runAsync).not.toHaveBeenCalled(); // 无 UPDATE/INSERT
  });

  it('platform 行正常覆盖（数据源更正下降 9000→8800）', async () => {
    const { db, rows } = makeDb([platformRow('2026-10-15', 9000)]);
    getDbMock.mockResolvedValue(db as never);

    const result = await recordPlatformSteps('2026-10-15', 8800);

    expect(result).toMatchObject({ steps: 8800, source: 'platform' });
    expect(rows[0]).toMatchObject({ steps: 8800, source: 'platform' });
  });

  it('首次同步：INSERT (date, steps, platform)', async () => {
    const { db, rows } = makeDb();
    getDbMock.mockResolvedValue(db as never);

    const result = await recordPlatformSteps('2026-10-15', 7200);

    expect(result).toMatchObject({
      date: '2026-10-15',
      steps: 7200,
      source: 'platform',
    });
    expect(rows[0]).toMatchObject({ steps: 7200, source: 'platform' });
  });
});

describe('clearStepRecord 清除手动值', () => {
  it('删除该日行，后续平台同步恢复写入 platform', async () => {
    const { db, rows } = makeDb([manualRow('2026-10-15', 6000)]);
    getDbMock.mockResolvedValue(db as never);

    await clearStepRecord('2026-10-15');
    expect(rows).toHaveLength(0);

    const result = await recordPlatformSteps('2026-10-15', 6500);
    expect(result).toMatchObject({ steps: 6500, source: 'platform' });
    expect(rows[0]).toMatchObject({ steps: 6500, source: 'platform' });
  });

  it('无记录日期清除为空操作（不抛错）', async () => {
    const { db } = makeDb();
    getDbMock.mockResolvedValue(db as never);
    await expect(clearStepRecord('2026-10-01')).resolves.toBeUndefined();
  });
});

describe('写入事务边界', () => {
  it('手动写入与平台写入均在单事务内执行', async () => {
    const { db } = makeDb();
    getDbMock.mockResolvedValue(db as never);

    await recordManualSteps('2026-10-18', 100);
    await recordPlatformSteps('2026-10-19', 200);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(2);
  });
});

// 类型兜底：StepLog.source 联合类型不被破坏
describe('类型回归', () => {
  it('mapRow 输出符合 StepLog 结构（null source 归 manual 且受保护）', async () => {
    const legacy: MemRow = { id: 9, date: '2026-10-08', steps: 9000, source: null, created_at: null };
    const { db, rows } = makeDb([legacy]);
    getDbMock.mockResolvedValue(db as never);

    const result = await recordPlatformSteps('2026-10-08', 7000);
    // 升级遗留 null 行展示为 manual，同样受平台写入保护
    expect(result.steps).toBe(9000);
    expect(result.source).toBe('manual');
    expect(rows[0]).toMatchObject({ steps: 9000 });
    const log: StepLog = result;
    expect(log.date).toBe('2026-10-08');
  });
});
