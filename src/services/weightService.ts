// 体重记录 CRUD

import { getDb, nowString } from '../db/database';
import type { WeightRecord } from '../types';

export class WeightError extends Error {}

interface Row {
  id: number;
  weight_kg: number;
  recorded_at: string | null;
}

function mapRow(r: Row): WeightRecord {
  return {
    id: r.id,
    weight_kg: r.weight_kg,
    recorded_at: r.recorded_at,
  };
}

export async function listWeights(): Promise<WeightRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM weight_record ORDER BY recorded_at DESC'
  );
  return rows.map(mapRow);
}

export async function createWeight(weight_kg: number): Promise<WeightRecord> {
  if (!isFinite(weight_kg) || weight_kg <= 0) {
    throw new WeightError('体重必须为正数');
  }
  const db = await getDb();
  const time = nowString();
  const res = await db.runAsync(
    'INSERT INTO weight_record (weight_kg, recorded_at) VALUES (?, ?)',
    [weight_kg, time]
  );
  return {
    id: Number(res.lastInsertRowId),
    weight_kg,
    recorded_at: time,
  };
}

export async function getLatestWeight(): Promise<WeightRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM weight_record ORDER BY recorded_at DESC LIMIT 1'
  );
  return row ? mapRow(row) : null;
}

export async function deleteWeight(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM weight_record WHERE id = ?', [id]);
}
