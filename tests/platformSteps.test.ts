import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import {
  todayDayRange,
  dayRangeForDate,
  parseLocalDate,
  toOffsetISO,
  parseStepsAggregate,
  unavailablePlatformSteps,
} from '../src/services/platformSteps';
import {
  recordPlatformSteps,
  getStepByDate,
  StepError,
} from '../src/services/stepService';
import { getDb } from '../src/db/database';

const mockedGetDb = vi.mocked(getDb);

// 带偏移 ISO-8601：YYYY-MM-DDTHH:mm:ss.sss±HH:mm（不接受裸时间，Instant.parse 依赖偏移）
const OFFSET_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;

describe('platformSteps 时间窗纯逻辑', () => {
  it('dayRangeForDate：任意历史日期携带本地偏移，解析回瞬时为当地日界', () => {
    const range = dayRangeForDate('2026-10-08');
    expect(range.startTime).toMatch(OFFSET_ISO_RE);
    expect(range.endTime).toMatch(OFFSET_ISO_RE);
    expect(range.startTime.startsWith('2026-10-08T00:00:00.000')).toBe(true);
    expect(range.endTime.startsWith('2026-10-08T23:59:59.999')).toBe(true);
    // 不论测试机位于哪个时区，瞬时必须严格对应当地 00:00 / 23:59:59.999
    expect(new Date(range.startTime).getTime()).toBe(
      new Date(2026, 9, 8, 0, 0, 0, 0).getTime()
    );
    expect(new Date(range.endTime).getTime()).toBe(
      new Date(2026, 9, 8, 23, 59, 59, 999).getTime()
    );
  });

  it('dayRangeForDate：个位月/日补零', () => {
    const range = dayRangeForDate('2026-01-05');
    expect(range.startTime.startsWith('2026-01-05T00:00:00.000')).toBe(true);
    expect(range.endTime.startsWith('2026-01-05T23:59:59.999')).toBe(true);
  });

  it('dayRangeForDate：非法/溢出日期抛错（编程错误而非降级）', () => {
    expect(() => dayRangeForDate('not-a-date')).toThrow();
    expect(() => dayRangeForDate('2026-13-01')).toThrow();
    expect(() => dayRangeForDate('2026-02-31')).toThrow();
  });

  it('parseLocalDate：合法/非法/溢出', () => {
    expect(parseLocalDate('2026-10-08')?.getDate()).toBe(8);
    expect(parseLocalDate('2026-02-31')).toBeNull();
    expect(parseLocalDate('x')).toBeNull();
  });

  it('todayDayRange：作为当日薄封装与 dayRangeForDate 当日入参一致', () => {
    const base = new Date(2026, 9, 11, 15, 30, 45);
    const fromToday = todayDayRange(base);
    const fromDate = dayRangeForDate('2026-10-11', base);
    expect(fromToday).toEqual(fromDate);
  });

  it('toOffsetISO：UTC 零点输出可被 Date 无损解析', () => {
    const iso = toOffsetISO(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    expect(new Date(iso).getTime()).toBe(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(iso).toMatch(OFFSET_ISO_RE);
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

  it('降级实现：不可用且任意日期读取均为 null', async () => {
    expect(await unavailablePlatformSteps.availability()).toBe('unavailable');
    expect(await unavailablePlatformSteps.requestPermissions()).toBe(false);
    expect(await unavailablePlatformSteps.readStepsForDate('2026-10-10')).toBe(null);
    expect(await unavailablePlatformSteps.readStepsForDate('2026-10-08')).toBe(null);
  });
});

// 构造 mock db 行
function rowOf(id: number, date: string, steps: number, source: string | null) {
  return { id, date, steps, source, created_at: '2026-10-10 08:00:00' };
}

// 构造带事务外壳的 mock db：withTransactionAsync 立即在同一调用栈执行回调
function makeMockDb(
  existing: ReturnType<typeof rowOf> | null,
  runImpl?: ReturnType<typeof vi.fn>
) {
  const runAsync = runImpl ?? vi.fn().mockResolvedValue({ lastInsertRowId: 1 });
  const withTransactionAsync = vi.fn(async (fn: () => Promise<void>) => fn());
  return {
    db: {
      getFirstAsync: vi.fn().mockResolvedValue(existing),
      runAsync,
      withTransactionAsync,
    } as never,
    runAsync,
    withTransactionAsync,
  };
}

describe('recordPlatformSteps 平台权威覆盖', () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
  });

  it('已有 manual 记录：平台值无条件覆盖且 source 转 platform', async () => {
    const { db, runAsync } = makeMockDb(rowOf(1, '2026-10-10', 5000, 'manual'));
    mockedGetDb.mockResolvedValue(db);

    const result = await recordPlatformSteps('2026-10-10', 8000);
    expect(result.steps).toBe(8000);
    expect(result.source).toBe('platform');
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
      [8000, 'platform', '2026-10-10 12:00:00', 1]
    );
  });

  it('已有 platform 记录且新值下降：仍以平台新值覆盖（数据源更正）', async () => {
    const { db, runAsync } = makeMockDb(rowOf(1, '2026-10-10', 9000, 'platform'));
    mockedGetDb.mockResolvedValue(db);

    const result = await recordPlatformSteps('2026-10-10', 8800);
    expect(result.steps).toBe(8800);
    expect(result.source).toBe('platform');
    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
      [8800, 'platform', '2026-10-10 12:00:00', 1]
    );
  });

  it('已有 source 缺省旧行：覆盖后归一化为 platform', async () => {
    const { db } = makeMockDb(rowOf(1, '2026-10-10', 5000, null));
    mockedGetDb.mockResolvedValue(db);

    const result = await recordPlatformSteps('2026-10-10', 6000);
    expect(result.source).toBe('platform');
  });

  it('无记录：事务内插入 platform 来源', async () => {
    const runAsync = vi.fn().mockResolvedValue({ lastInsertRowId: 9 });
    const { db } = makeMockDb(null, runAsync);
    mockedGetDb.mockResolvedValue(db);

    const result = await recordPlatformSteps('2026-10-08', 6500);
    expect(result).toMatchObject({
      id: 9,
      date: '2026-10-08',
      steps: 6500,
      source: 'platform',
    });
    expect(runAsync).toHaveBeenCalledWith(
      'INSERT INTO step_log (date, steps, source, created_at) VALUES (?, ?, ?, ?)',
      ['2026-10-08', 6500, 'platform', '2026-10-10 12:00:00']
    );
  });

  it('写入路径经过事务外壳（并发安全由单事务保证）', async () => {
    const { db, withTransactionAsync } = makeMockDb(null);
    mockedGetDb.mockResolvedValue(db);

    await recordPlatformSteps('2026-10-10', 100);
    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('负数/非有限步数抛 StepError 且不写库', async () => {
    const runAsync = vi.fn();
    const { db } = makeMockDb(null, runAsync);
    mockedGetDb.mockResolvedValue(db);

    await expect(recordPlatformSteps('2026-10-10', -1)).rejects.toThrow(StepError);
    await expect(recordPlatformSteps('2026-10-10', NaN)).rejects.toThrow(StepError);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('getStepByDate：旧数据 source 缺省映射为 manual', async () => {
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn().mockResolvedValue(rowOf(1, '2026-10-10', 5000, null)),
    } as never);

    const s = await getStepByDate('2026-10-10');
    expect(s?.source).toBe('manual');
  });
});
