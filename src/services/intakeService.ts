// 每日摄入记录 CRUD + 汇总

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import type { DailyNutrition, IntakeLog } from '../types';

export class IntakeError extends BizError {}

interface Row {
  id: number;
  date: string;
  food_item_id: number;
  grams: number;
  meal: string;
  created_at: string | null;
}

function mapRow(r: Row): IntakeLog {
  return {
    id: r.id,
    date: r.date,
    food_item_id: r.food_item_id,
    grams: r.grams,
    meal: r.meal,
    created_at: r.created_at,
  };
}

export async function listIntake(date: string): Promise<IntakeLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM intake_log WHERE date = ? ORDER BY id',
    [date]
  );
  return rows.map(mapRow);
}

export async function createIntake(input: {
  date: string;
  food_item_id: number;
  grams: number;
  meal: string;
}): Promise<IntakeLog> {
  if (!isFinite(input.grams) || input.grams <= 0) {
    throw new IntakeError(ERR.INVALID_GRAMS);
  }
  const db = await getDb();
  const time = nowString();
  const res = await db.runAsync(
    'INSERT INTO intake_log (date, food_item_id, grams, meal, created_at) VALUES (?, ?, ?, ?, ?)',
    [input.date, input.food_item_id, input.grams, input.meal, time]
  );
  return {
    id: Number(res.lastInsertRowId),
    date: input.date,
    food_item_id: input.food_item_id,
    grams: input.grams,
    meal: input.meal,
    created_at: time,
  };
}

export async function deleteIntake(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM intake_log WHERE id = ?', [id]);
}

export async function countIntakeByFoodItem(food_item_id: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM intake_log WHERE food_item_id = ?',
    [food_item_id]
  );
  return row?.n ?? 0;
}

// 汇总当日营养：按 grams/100g * per100g 现算
interface JoinedRow {
  grams: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
}

export async function summarizeDaily(date: string): Promise<DailyNutrition> {
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedRow>(
    `SELECT il.grams, fi.kcal_per_100g, fi.protein_per_100g, fi.carb_per_100g, fi.fat_per_100g
     FROM intake_log il
     JOIN food_item fi ON il.food_item_id = fi.id
     WHERE il.date = ?`,
    [date]
  );
  let total_kcal = 0;
  let total_protein = 0;
  let total_carb = 0;
  let total_fat = 0;
  for (const r of rows) {
    const factor = r.grams / 100;
    total_kcal += r.kcal_per_100g * factor;
    total_protein += r.protein_per_100g * factor;
    total_carb += r.carb_per_100g * factor;
    total_fat += r.fat_per_100g * factor;
  }
  return {
    total_kcal,
    total_protein,
    total_carb,
    total_fat,
  };
}
