// 每日步数记录：设备平台（Health Connect/HealthKit）为唯一权威数据源。
// 升级遗留的 manual 行只读保留，被平台读取覆盖后转为 platform。

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

// 平台同步写入：平台值是该日唯一权威值，无条件覆盖（含旧 manual 行与数值下降场景）。
// SELECT→UPDATE/INSERT 包在单事务内，并发竞态时整体回滚而非产生重复行。
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
    const time = nowString();
    const source: StepSource = 'platform';
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
