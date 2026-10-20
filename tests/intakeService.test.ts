// intakeService 单测：updateIntake 编辑语义 + resolvePortionPrefill 份量反解
// expo-sqlite 在 node 环境不可用，使用内存行数组的最小假实现（同 stepService.test.ts 模式）

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-20 12:00:00',
  todayString: () => '2026-10-20',
}));

import * as dbMod from '../src/db/database';
import { updateIntake, resolvePortionPrefill } from '../src/services/intakeService';
import { ERR } from '../src/services/errors';
import type { FoodPortion } from '../src/types';

const getDbMock = vi.mocked(dbMod.getDb);

interface MemRow {
  id: number;
  date: string;
  food_item_id: number;
  grams: number;
  meal: string;
  created_at: string | null;
}

function makeDb(initial: MemRow[] = []) {
  const rows = [...initial];
  const runAsync = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith('UPDATE intake_log SET grams = ?, meal = ?')) {
      const [grams, meal, id] = params as [number, string, number];
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.grams = grams;
        row.meal = meal;
      }
      return { changes: row ? 1 : 0 };
    }
    return {};
  });
  return {
    db: { runAsync },
    rows,
  };
}

const BASE_ROW: MemRow = {
  id: 7,
  date: '2026-10-18',
  food_item_id: 3,
  grams: 200,
  meal: 'lunch',
  created_at: '2026-10-18 09:00:00',
};

describe('updateIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常更新克数与餐次', async () => {
    const { db, rows } = makeDb([{ ...BASE_ROW }]);
    getDbMock.mockResolvedValue(db as never);
    await updateIntake(7, { grams: 150, meal: 'dinner' });
    expect(rows[0].grams).toBe(150);
    expect(rows[0].meal).toBe('dinner');
  });

  it('保留 created_at / date / food_item_id 不变', async () => {
    const { db, rows } = makeDb([{ ...BASE_ROW }]);
    getDbMock.mockResolvedValue(db as never);
    await updateIntake(7, { grams: 150, meal: 'dinner' });
    expect(rows[0].created_at).toBe('2026-10-18 09:00:00');
    expect(rows[0].date).toBe('2026-10-18');
    expect(rows[0].food_item_id).toBe(3);
  });

  it.each([
    ['零克数', 0],
    ['负克数', -50],
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('非法克数拒绝：%s', async (_label, grams) => {
    const { db, rows } = makeDb([{ ...BASE_ROW }]);
    getDbMock.mockResolvedValue(db as never);
    await expect(updateIntake(7, { grams, meal: 'lunch' })).rejects.toMatchObject({
      code: ERR.INVALID_GRAMS,
    });
    // 记录保持原值
    expect(rows[0].grams).toBe(200);
    expect(rows[0].meal).toBe('lunch');
  });
});

describe('resolvePortionPrefill', () => {
  const PALM: FoodPortion = { zh: '掌心大小', en: 'palm-sized', grams: 100 };
  const CUP: FoodPortion = { zh: '杯', en: 'cup', grams: 50 };

  it('命中：150g 反解为掌心 × 1.5', () => {
    expect(resolvePortionPrefill([PALM], 150)).toEqual({ anchorIdx: 0, qty: 1.5 });
  });

  it('多锚点命中时取首个', () => {
    // 100g 既可解为掌心(100)×1 也可解为杯(50)×2
    expect(resolvePortionPrefill([PALM, CUP], 100)).toEqual({ anchorIdx: 0, qty: 1 });
  });

  it('数量下边界 0.5 命中', () => {
    expect(resolvePortionPrefill([PALM], 50)).toEqual({ anchorIdx: 0, qty: 0.5 });
  });

  it('数量上边界 8 命中', () => {
    expect(resolvePortionPrefill([PALM], 800)).toEqual({ anchorIdx: 0, qty: 8 });
  });

  it('超出数量上限不命中', () => {
    // 850g 需要掌心 × 8.5，超出 0.5–8 域
    expect(resolvePortionPrefill([PALM], 850)).toBeNull();
  });

  it('无法精确换算时返回 null', () => {
    expect(resolvePortionPrefill([PALM], 137)).toBeNull();
  });

  it('无份量预设返回 null', () => {
    expect(resolvePortionPrefill(null, 100)).toBeNull();
    expect(resolvePortionPrefill([], 100)).toBeNull();
  });

  it.each([
    ['零', 0],
    ['负数', -100],
    ['NaN', NaN],
  ])('非法克数返回 null：%s', (_label, grams) => {
    expect(resolvePortionPrefill([PALM], grams)).toBeNull();
  });
});
