// 每日摄入记录 CRUD + 汇总

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import type { DailyNutrition, FoodItem, FoodPortion, IntakeLog } from '../types';

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

// 全部摄入记录（按日期正序，导出/备份用）
export async function listAllIntake(): Promise<IntakeLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM intake_log ORDER BY date, id'
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

// 编辑既有记录：仅更新克数与餐次，保留 created_at / date / food_item_id
export async function updateIntake(
  id: number,
  input: { grams: number; meal: string }
): Promise<void> {
  if (!isFinite(input.grams) || input.grams <= 0) {
    throw new IntakeError(ERR.INVALID_GRAMS);
  }
  const db = await getDb();
  await db.runAsync('UPDATE intake_log SET grams = ?, meal = ? WHERE id = ?', [
    input.grams,
    input.meal,
    id,
  ]);
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

// ============ Quick Log 纯逻辑（vitest 可测） ============

export type MealValue = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// 旧数据餐次值（中文）→ 规范枚举值；展示层映射与编辑预填归一共用此表
export const LEGACY_MEAL_VALUES: Record<string, MealValue> = {
  早餐: 'breakfast',
  午餐: 'lunch',
  晚餐: 'dinner',
  加餐: 'snack',
};

// 编辑预填餐次归一：规范枚举值原样返回；旧中文值映射；未知值按当前时段推断兜底
export function normalizeMealValue(value: string, now: Date = new Date()): MealValue {
  if (
    value === 'breakfast' ||
    value === 'lunch' ||
    value === 'dinner' ||
    value === 'snack'
  ) {
    return value;
  }
  const mapped = LEGACY_MEAL_VALUES[value];
  if (mapped) return mapped;
  return defaultMealFor(now);
}

// 按当前时段推断默认餐次：<10:30 早 / <14:30 午 / <21:00 晚 / 其余加餐
export function defaultMealFor(d: Date): MealValue {
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 14 * 60 + 30) return 'lunch';
  if (minutes < 21 * 60) return 'dinner';
  return 'snack';
}

// 手动克数输入域：Quick Log 精确克数自由编辑允许 1–2000 正整数
export const CUSTOM_GRAMS_MIN = 1;
export const CUSTOM_GRAMS_MAX = 2000;

// 解析手动输入的克数字符串：仅接受纯数字且落在 1–2000 的整数，非法返回 null
export function parseCustomGrams(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (n < CUSTOM_GRAMS_MIN || n > CUSTOM_GRAMS_MAX) return null;
  return n;
}

// 按份量换算营养预览：per-100g × grams/100
export function scaleNutrition(
  item: Pick<
    FoodItem,
    'kcal_per_100g' | 'protein_per_100g' | 'carb_per_100g' | 'fat_per_100g'
  >,
  grams: number
): { kcal: number; protein: number; carb: number; fat: number } {
  const factor = grams / 100;
  return {
    kcal: item.kcal_per_100g * factor,
    protein: item.protein_per_100g * factor,
    carb: item.carb_per_100g * factor,
    fat: item.fat_per_100g * factor,
  };
}

// 份量刻度尺数量域：与 QuickLogSheet 的 RulerPicker 量程保持一致
export const PORTION_QTY_MIN = 0.5;
export const PORTION_QTY_MAX = 8;
export const PORTION_QTY_STEP = 0.5;

// 编辑预填反解：当前克数能由某锚点 × 合法数量精确换算（grams = round(数量 × 锚点克数)）时，
// 返回首个命中锚点与数量；无预设/未命中/非法克数返回 null（落到精确克数模式）
export function resolvePortionPrefill(
  portions: FoodPortion[] | null,
  grams: number
): { anchorIdx: number; qty: number } | null {
  if (!portions || portions.length === 0) return null;
  if (!isFinite(grams) || grams <= 0) return null;
  for (let i = 0; i < portions.length; i++) {
    const anchor = portions[i];
    if (!isFinite(anchor.grams) || anchor.grams <= 0) continue;
    for (let qty = PORTION_QTY_MIN; qty <= PORTION_QTY_MAX; qty += PORTION_QTY_STEP) {
      if (Math.round(qty * anchor.grams) === grams) {
        return { anchorIdx: i, qty };
      }
    }
  }
  return null;
}
