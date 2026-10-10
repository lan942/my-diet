// 食物分类与条目 CRUD + 种子数据

import { getDb, nowString } from '../db/database';
import type { FoodCategory, FoodItem } from '../types';
import { countIntakeByFoodItem } from './intakeService';

export class FoodError extends Error {}

interface CatRow {
  id: number;
  name: string;
  sort_order: number;
}

interface ItemRow {
  id: number;
  name: string;
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi: number | null;
  notes: string;
  updated_at: string | null;
}

function mapCatRow(r: CatRow): FoodCategory {
  return { id: r.id, name: r.name, sort_order: r.sort_order };
}

function mapItemRow(r: ItemRow): FoodItem {
  return {
    id: r.id,
    name: r.name,
    category_id: r.category_id,
    kcal_per_100g: r.kcal_per_100g,
    protein_per_100g: r.protein_per_100g,
    carb_per_100g: r.carb_per_100g,
    fat_per_100g: r.fat_per_100g,
    gi: r.gi,
    notes: r.notes,
    updated_at: r.updated_at,
  };
}

// ============ 分类 ============

export async function listCategories(): Promise<FoodCategory[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CatRow>(
    'SELECT * FROM food_category ORDER BY sort_order, id'
  );
  return rows.map(mapCatRow);
}

export async function ensureSeedCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<CatRow>('SELECT * FROM food_category');
  if (existing.length > 0) return;
  const seeds: Array<[string, number]> = [
    ['碳水', 1],
    ['蛋白质', 2],
    ['脂肪', 3],
    ['抗氧化蔬菜', 4],
    ['膳食纤维', 5],
  ];
  for (const [name, order] of seeds) {
    await db.runAsync(
      'INSERT INTO food_category (name, sort_order) VALUES (?, ?)',
      [name, order]
    );
  }
}

// ============ 食物条目 ============

export async function listFoodItems(category_id?: number): Promise<FoodItem[]> {
  const db = await getDb();
  if (category_id !== undefined) {
    const rows = await db.getAllAsync<ItemRow>(
      'SELECT * FROM food_item WHERE category_id = ? ORDER BY name COLLATE NOCASE',
      [category_id]
    );
    return rows.map(mapItemRow);
  }
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM food_item ORDER BY category_id, name COLLATE NOCASE'
  );
  return rows.map(mapItemRow);
}

function validateNonNegatives(
  kcal: number,
  protein: number,
  carb: number,
  fat: number
): void {
  if (
    !isFinite(kcal) ||
    !isFinite(protein) ||
    !isFinite(carb) ||
    !isFinite(fat)
  ) {
    throw new FoodError('营养值必须为有限数');
  }
  if (kcal < 0 || protein < 0 || carb < 0 || fat < 0) {
    throw new FoodError('营养值必须为非负数');
  }
}

export async function createFoodItem(input: {
  name: string;
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi?: number | null;
  notes?: string;
}): Promise<FoodItem> {
  if (!input.name?.trim()) throw new FoodError('食物名称不能为空');
  validateNonNegatives(
    input.kcal_per_100g,
    input.protein_per_100g,
    input.carb_per_100g,
    input.fat_per_100g
  );
  const db = await getDb();
  const time = nowString();
  const res = await db.runAsync(
    `INSERT INTO food_item
     (name, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.category_id,
      input.kcal_per_100g,
      input.protein_per_100g,
      input.carb_per_100g,
      input.fat_per_100g,
      input.gi ?? null,
      input.notes ?? '',
      time,
    ]
  );
  return {
    id: Number(res.lastInsertRowId),
    name: input.name.trim(),
    category_id: input.category_id,
    kcal_per_100g: input.kcal_per_100g,
    protein_per_100g: input.protein_per_100g,
    carb_per_100g: input.carb_per_100g,
    fat_per_100g: input.fat_per_100g,
    gi: input.gi ?? null,
    notes: input.notes ?? '',
    updated_at: time,
  };
}

export async function updateFoodItem(
  id: number,
  input: {
    name: string;
    category_id: number;
    kcal_per_100g: number;
    protein_per_100g: number;
    carb_per_100g: number;
    fat_per_100g: number;
    gi?: number | null;
    notes?: string;
  }
): Promise<void> {
  if (!input.name?.trim()) throw new FoodError('食物名称不能为空');
  validateNonNegatives(
    input.kcal_per_100g,
    input.protein_per_100g,
    input.carb_per_100g,
    input.fat_per_100g
  );
  const db = await getDb();
  await db.runAsync(
    `UPDATE food_item SET
     name=?, category_id=?, kcal_per_100g=?, protein_per_100g=?, carb_per_100g=?, fat_per_100g=?, gi=?, notes=?, updated_at=?
     WHERE id=?`,
    [
      input.name.trim(),
      input.category_id,
      input.kcal_per_100g,
      input.protein_per_100g,
      input.carb_per_100g,
      input.fat_per_100g,
      input.gi ?? null,
      input.notes ?? '',
      nowString(),
      id,
    ]
  );
}

export async function deleteFoodItem(id: number): Promise<void> {
  const refCount = await countIntakeByFoodItem(id);
  if (refCount > 0) {
    throw new FoodError('该食物已被摄入记录引用，无法删除');
  }
  const db = await getDb();
  await db.runAsync('DELETE FROM food_item WHERE id = ?', [id]);
}

// GI <= 55 视为低 GI
export function isLowGI(gi: number | null): boolean {
  return gi !== null && gi <= 55;
}

// ============ 种子食物 ============

export interface SeedFood {
  name: string;
  category_name: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  gi?: number | null;
  notes?: string;
}

export const SEED_FOODS: SeedFood[] = [
  // 碳水
  { name: '燕麦片', category_name: '碳水', kcal: 389, protein: 16.9, carb: 66.9, fat: 6.9, gi: 55, notes: '低 GI，富含 β-葡聚糖' },
  { name: '糙米', category_name: '碳水', kcal: 348, protein: 7.7, carb: 77.9, fat: 2.7, gi: 56 },
  { name: '全麦面包', category_name: '碳水', kcal: 246, protein: 8.5, carb: 48.4, fat: 3.6, gi: 49, notes: '低 GI' },
  { name: '红薯', category_name: '碳水', kcal: 86, protein: 1.6, carb: 20.1, fat: 0.1, gi: 70 },
  { name: '紫薯', category_name: '碳水', kcal: 82, protein: 1.2, carb: 18.9, fat: 0.2, gi: 77 },
  { name: '藜麦', category_name: '碳水', kcal: 368, protein: 14.1, carb: 64.2, fat: 6.1, gi: 53, notes: '低 GI，完全蛋白' },
  { name: '白米饭', category_name: '碳水', kcal: 116, protein: 2.6, carb: 25.9, fat: 0.3, gi: 73 },
  { name: '意大利面（全麦）', category_name: '碳水', kcal: 324, protein: 12.5, carb: 62.7, fat: 1.8, gi: 48, notes: '低 GI' },

  // 蛋白质
  { name: '鸡胸肉', category_name: '蛋白质', kcal: 165, protein: 31, carb: 0, fat: 3.6 },
  { name: '鸡蛋', category_name: '蛋白质', kcal: 155, protein: 13, carb: 1.1, fat: 11 },
  { name: '三文鱼', category_name: '蛋白质', kcal: 208, protein: 20, carb: 0, fat: 13, notes: '富含 Ω-3' },
  { name: '牛肉（瘦）', category_name: '蛋白质', kcal: 250, protein: 26, carb: 0, fat: 15 },
  { name: '虾', category_name: '蛋白质', kcal: 99, protein: 24, carb: 0.2, fat: 0.3 },
  { name: '豆腐', category_name: '蛋白质', kcal: 81, protein: 8.1, carb: 3.8, fat: 3.7 },
  { name: '希腊酸奶', category_name: '蛋白质', kcal: 59, protein: 10, carb: 3.6, fat: 0.4 },
  { name: '鳕鱼', category_name: '蛋白质', kcal: 105, protein: 23, carb: 0, fat: 0.9 },

  // 脂肪
  { name: '牛油果', category_name: '脂肪', kcal: 160, protein: 2, carb: 8.5, fat: 14.7, notes: '单不饱和脂肪酸' },
  { name: '杏仁', category_name: '脂肪', kcal: 579, protein: 21, carb: 22, fat: 50.6 },
  { name: '橄榄油', category_name: '脂肪', kcal: 899, protein: 0, carb: 0, fat: 99.9 },
  { name: '奇亚籽', category_name: '脂肪', kcal: 486, protein: 16, carb: 42, fat: 30.7, notes: 'Ω-3 + 膳食纤维' },

  // 抗氧化蔬菜
  { name: '菠菜', category_name: '抗氧化蔬菜', kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4, notes: '叶黄素/玉米黄质' },
  { name: '西兰花', category_name: '抗氧化蔬菜', kcal: 34, protein: 2.8, carb: 7, fat: 0.4, notes: '萝卜硫素' },
  { name: '蓝莓', category_name: '抗氧化蔬菜', kcal: 57, protein: 0.7, carb: 14.5, fat: 0.3, notes: '花青素' },
  { name: '番茄', category_name: '抗氧化蔬菜', kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2, notes: '番茄红素' },
  { name: '胡萝卜', category_name: '抗氧化蔬菜', kcal: 41, protein: 0.9, carb: 9.6, fat: 0.2, notes: 'β-胡萝卜素' },
  { name: '紫甘蓝', category_name: '抗氧化蔬菜', kcal: 31, protein: 1.4, carb: 7.8, fat: 0.2, notes: '花青素' },

  // 膳食纤维
  { name: '奇亚籽', category_name: '膳食纤维', kcal: 486, protein: 16, carb: 42, fat: 30.7, notes: '10g 纤维/100g' },
  { name: '燕麦片', category_name: '膳食纤维', kcal: 389, protein: 16.9, carb: 66.9, fat: 6.9 },
  { name: '扁豆', category_name: '膳食纤维', kcal: 353, protein: 25, carb: 63, fat: 0.4 },
  { name: '西兰花', category_name: '膳食纤维', kcal: 34, protein: 2.8, carb: 7, fat: 0.4 },
  { name: '菠菜', category_name: '膳食纤维', kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4 },
];

export async function ensureSeedFoods(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<ItemRow>('SELECT * FROM food_item');
  if (existing.length > 0) return;

  const cats = await listCategories();
  const catMap = new Map(cats.map((c) => [c.name, c.id]));

  for (const seed of SEED_FOODS) {
    const catId = catMap.get(seed.category_name);
    if (catId === undefined) continue;
    await db.runAsync(
      `INSERT INTO food_item
       (name, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seed.name,
        catId,
        seed.kcal,
        seed.protein,
        seed.carb,
        seed.fat,
        seed.gi ?? null,
        seed.notes ?? '',
        nowString(),
      ]
    );
  }
}
