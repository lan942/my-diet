import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import {
  todayDayRange,
  parseStepsAggregate,
  unavailablePlatformSteps,
} from '../src/services/platformSteps';
import {
  upsertStep,
  syncPlatformSteps,
  getStepByDate,
  StepError,
} from '../src/services/stepService';
import { getDb } from '../src/db/database';

const mockedGetDb = vi.mocked(getDb);

describe('platformSteps 纯逻辑', () => {
  it('todayDayRange：当地当日 00:00:00.000 ~ 23:59:59.999', () => {
    const range = todayDayRange(new Date(2026, 9, 11, 15, 30, 45));
    expect(range.startTime).toBe('2026-10-11T00:00:00.000');
    expect(range.endTime).toBe('2026-10-11T23:59:59.999');
  });

  it('todayDayRange：个位月/日补零', () => {
    const range = todayDayRange(new Date(2026, 0, 5));
    expect(range.startTime).toBe('2026-01-05T00:00:00.000');
  });

  it('parseStepsAggregate：COUNT_TOTAL 取整', () => {
    expect(parseStepsAggregate({ COUNT_TOTAL: 8123.7 })).toBe(8124);
    expect(parseStepsAggregate({ COUNT_TOTAL: 0 })).toBe(0);
  });

  it('parseStepsAggregate：缺省/NaN/负数归零', () => {
    expect(parseStepsAggregate(undefined)).toBe(0);
    expect(parseStepsAggregate(null)).toBe(0);
    expect(parseStepsAggregate({})).toBe(0);
    expect(parseStepsAggregate({ COUNT_TOTAL: NaN })).toBe(0);
    expect(parseStepsAggregate({ COUNT_TOTAL: -5 })).toBe(0);
  });

  it('降级实现：不可用且所有操作走不通', async () => {
    expect(await unavailablePlatformSteps.availability()).toBe('unavailable');
    expect(await unavailablePlatformSteps.requestPermissions()).toBe(false);
    expect(await unavailablePlatformSteps.readTodaySteps()).toBe(null);
  });
});

// 构造 mock db 行
function rowOf(id: number, date: string, steps: number, source: string | null) {
  return { id, date, steps, source, created_at: '2026-10-10 08:00:00' };
}

describe('stepService 同步覆盖规则', () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
  });

  it('当日已有 manual 记录：平台同步跳过，不写库', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined);
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 5000, 'manual')),
      runAsync,
    } as never);

    const result = await syncPlatformSteps('2026-10-10', 8000);
    expect(result).toBe(null);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('当日已有 platform 记录且新值更大：更新为 platform', async () => {
    const runAsync = vi.fn().mockResolvedValue({ lastInsertRowId: 1 });
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 5000, 'platform')),
      runAsync,
    } as never);

    const result = await syncPlatformSteps('2026-10-10', 8000);
    expect(result?.steps).toBe(8000);
    expect(result?.source).toBe('platform');
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
      [8000, 'platform', '2026-10-10 12:00:00', 1]
    );
  });

  it('当日已有 platform 记录且新值未增长：返回原值不写库', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined);
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 9000, 'platform')),
      runAsync,
    } as never);

    const result = await syncPlatformSteps('2026-10-10', 8000);
    expect(result?.steps).toBe(9000);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('当日无记录：插入 platform 来源', async () => {
    const runAsync = vi.fn().mockResolvedValue({ lastInsertRowId: 9 });
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(null),
      runAsync,
    } as never);

    const result = await syncPlatformSteps('2026-10-10', 6500);
    expect(result).toMatchObject({
      id: 9,
      date: '2026-10-10',
      steps: 6500,
      source: 'platform',
    });
    expect(runAsync).toHaveBeenCalledWith(
      'INSERT INTO step_log (date, steps, source, created_at) VALUES (?, ?, ?, ?)',
      ['2026-10-10', 6500, 'platform', '2026-10-10 12:00:00']
    );
  });

  it('手动录入始终覆盖（含覆盖 platform 记录）', async () => {
    const runAsync = vi.fn().mockResolvedValue({ lastInsertRowId: 1 });
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 8000, 'platform')),
      runAsync,
    } as never);

    const result = await upsertStep('2026-10-10', 3000);
    expect(result.steps).toBe(3000);
    expect(result.source).toBe('manual');
    expect(runAsync).toHaveBeenCalled();
  });

  it('负数步数：同步与手动均抛 StepError', async () => {
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(null),
      runAsync: vi.fn(),
    } as never);

    await expect(syncPlatformSteps('2026-10-10', -1)).rejects.toThrow(StepError);
    await expect(upsertStep('2026-10-10', -1)).rejects.toThrow(StepError);
  });

  it('getStepByDate：旧数据 source 缺省映射为 manual', async () => {
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 5000, null)),
    } as never);

    const s = await getStepByDate('2026-10-10');
    expect(s?.source).toBe('manual');
  });
});
