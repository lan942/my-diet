// 每日步数记录

import { getDb, nowString } from '../db/database';
import type { StepLog } from '../types';

export class StepError extends Error {}

interface Row {
  id: number;
  date: string;
  steps: number;
  created_at: string | null;
}

function mapRow(r: Row): StepLog {
  return {
    id: r.id,
    date: r.date,
    steps: r.steps,
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

export async function upsertStep(date: string, steps: number): Promise<StepLog> {
  if (!isFinite(steps) || steps < 0) {
    throw new StepError('步数必须为非负数');
  }
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>(
    'SELECT * FROM step_log WHERE date = ?',
    [date]
  );
  const time = nowString();
  if (existing) {
    await db.runAsync(
      'UPDATE step_log SET steps = ?, created_at = ? WHERE id = ?',
      [steps, time, existing.id]
    );
    return { id: existing.id, date, steps, created_at: time };
  }
  const res = await db.runAsync(
    'INSERT INTO step_log (date, steps, created_at) VALUES (?, ?, ?)',
    [date, steps, time]
  );
  return {
    id: Number(res.lastInsertRowId),
    date,
    steps,
    created_at: time,
  };
}

// 步数估算消耗热量：每步约 0.04 kcal
export function stepsToKcal(steps: number): number {
  return steps * 0.04;
}
