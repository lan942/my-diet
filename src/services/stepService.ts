// 每日步数记录（manual=手动录入 / platform=健康平台同步）

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import type { StepLog, StepSource } from '../types';

export class StepError extends BizError {}

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

// 手动录入：始终覆盖（用户明确意图）
export async function upsertStep(date: string, steps: number): Promise<StepLog> {
  return upsertStepInternal(date, steps, 'manual');
}

async function upsertStepInternal(
  date: string,
  steps: number,
  source: StepSource
): Promise<StepLog> {
  if (!isFinite(steps) || steps < 0) {
    throw new StepError(ERR.INVALID_STEPS);
  }
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>(
    'SELECT * FROM step_log WHERE date = ?',
    [date]
  );
  const time = nowString();
  if (existing) {
    await db.runAsync(
      'UPDATE step_log SET steps = ?, source = ?, created_at = ? WHERE id = ?',
      [steps, source, time, existing.id]
    );
    return { id: existing.id, date, steps, source, created_at: time };
  }
  const res = await db.runAsync(
    'INSERT INTO step_log (date, steps, source, created_at) VALUES (?, ?, ?, ?)',
    [date, steps, source, time]
  );
  return {
    id: Number(res.lastInsertRowId),
    date,
    steps,
    source,
    created_at: time,
  };
}

// 平台同步：不覆盖当日 manual 记录；platform 记录取较大值（当日聚合只会增多）
// 返回 null 表示被 manual 记录保护跳过
export async function syncPlatformSteps(
  date: string,
  steps: number
): Promise<StepLog | null> {
  if (!isFinite(steps) || steps < 0) {
    throw new StepError(ERR.INVALID_STEPS);
  }
  const existing = await getStepByDate(date);
  if (existing && existing.source === 'manual') {
    return null;
  }
  if (existing && steps <= existing.steps) {
    return existing; // 平台值未增长，无需写库
  }
  return upsertStepInternal(date, steps, 'platform');
}

// 步数估算消耗热量：每步约 0.04 kcal
export function stepsToKcal(steps: number): number {
  return steps * 0.04;
}
