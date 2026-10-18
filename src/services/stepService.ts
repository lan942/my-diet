// 每日步数记录：platform=健康平台同步（无手动覆盖日的权威源），
// manual=用户显式覆盖值（平台写入跳过，清除后恢复平台权威）。

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import type { StepLog, StepSource } from '../types';

export class StepError extends BizError {}

// 手动录入步数上限：防误输（超马一日约 5–8 万步）
export const MAX_MANUAL_STEPS = 100000;

interface Row {
  id: number;
  date: string;
  steps: number;
  source: string | null;
  created_at: string | null;
}

function mapRow(r: Row): StepLog {
  return {
    id: r.id,
    date: r.date,
    steps: r.steps,
    source: r.source === 'platform' ? 'platform' : 'manual',
    created_at: r.created_at,
  };
}

export async function listSteps(): Promise<StepLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM step_log ORDER BY date DESC, id DESC'
  );
  return rows.map(mapRow);
}

export async function getStepByDate(date: string): Promise<StepLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM step_log WHERE date = ?',
    [date]
  );
  return row ? mapRow(row) : null;
}

// 平台同步写入：SELECT→UPDATE/INSERT 包在单事务内，并发竞态时整体回滚而非产生重复行。
// 命中 manual 行（用户显式覆盖值）时直接返回该行、SHALL NOT 覆盖；返回值为该日实际生效的记录。
export async function recordPlatformSteps(
  date: string,
  steps: number
): Promise<StepLog> {
  if (!isFinite(steps) || steps < 0) {
    throw new StepError(ERR.INVALID_STEPS);
  }
  const db = await getDb();
  let result!: StepLog;
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<Row>(
      'SELECT * FROM step_log WHERE date = ?',
      [date]
    );
    if (existing) {
      // 手动覆盖值受保护：非 platform 来源（manual 或升级遗留 null 行，展示层均为 manual）
      // 的行平台读取不写入，返回既有展示行
      if (existing.source !== 'platform') {
        result = mapRow(existing);
        return;
      }
      const time = nowString();
      const source: StepSource = 'platform';
      await db.runAsync(
        'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
        [steps, source, time, existing.id]
      );
      result = { id: existing.id, date, steps, source, created_at: time };
      return;
    }
    const time = nowString();
    const res = await db.runAsync(
      'INSERT INTO step_log (date, steps, source, created_at) VALUES (?, ?, ?, ?)',
      [date, steps, 'platform', time]
    );
    result = {
      id: Number(res.lastInsertRowId),
      date,
      steps,
      source: 'platform',
      created_at: time,
    };
  });
  return result;
}

// 手动录入：非负整数 ≤ MAX_MANUAL_STEPS；单事务 upsert 覆盖该日既有行（含 platform 行），
// 置 source=manual。该日此后平台同步跳过，直至清除。
export async function recordManualSteps(
  date: string,
  steps: number
): Promise<StepLog> {
  if (
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > MAX_MANUAL_STEPS
  ) {
    throw new StepError(ERR.INVALID_STEPS);
  }
  const db = await getDb();
  let result!: StepLog;
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<Row>(
      'SELECT * FROM step_log WHERE date = ?',
      [date]
    );
    const time = nowString();
    const source: StepSource = 'manual';
    if (existing) {
      await db.runAsync(
        'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
        [steps, source, time, existing.id]
      );
      result = { id: existing.id, date, steps, source, created_at: time };
      return;
    }
    const res = await db.runAsync(
      'INSERT INTO step_log (date, steps, source, created_at) VALUES (?, ?, ?, ?)',
      [date, steps, source, time]
    );
    result = {
      id: Number(res.lastInsertRowId),
      date,
      steps,
      source,
      created_at: time,
    };
  });
  return result;
}

// 清除手动值：删除该日行，恢复平台权威（后续自动同步可重新写入 platform 值）
export async function clearStepRecord(date: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM step_log WHERE date = ?', [date]);
  });
}
