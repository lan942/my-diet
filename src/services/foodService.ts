// 食物分类与条目 CRUD + 种子数据

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import { getLocale, type TranslationKey } from '../i18n';
import { countIntakeByFoodItem } from './intakeService';
import type { FoodCategory, FoodItem } from '../types';

export class FoodError extends BizError {}

// 固定种子分类的展示映射（旧库存量为中文名时按 locale 显示翻译，其余原样展示）
const SEED_CATEGORY_KEYS: Record<string, TranslationKey> = {
  碳水: 'cat.carb',
  蛋白质: 'cat.protein',
  脂肪: 'cat.fat',
  抗氧化蔬菜: 'cat.antioxidantVeg',
  膳食纤维: 'cat.fiber',
};

export function categoryDisplayKey(name: string): TranslationKey | null {
  return SEED_CATEGORY_KEYS[name] ?? null;
}

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

// 种子分类：随首启 locale 决定入库语言（新装英文设备入库英文名）
const SEED_CATEGORIES: { zh: string; en: string; order: number }[] = [
  { zh: '碳水', en: 'Carbs', order: 1 },
  { zh: '蛋白质', en: 'Protein', order: 2 },
  { zh: '脂肪', en: 'Fats', order: 3 },
  { zh: '抗氧化蔬菜', en: 'Antioxidant Veggies', order: 4 },
  { zh: '膳食纤维', en: 'Fiber', order: 5 },
];

export async function ensureSeedCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<CatRow>('SELECT * FROM food_category');
  if (existing.length > 0) return;
  const locale = getLocale();
  for (const cat of SEED_CATEGORIES) {
    await db.runAsync(
      'INSERT INTO food_category (name, sort_order) VALUES (?, ?)',
      [locale === 'zh' ? cat.zh : cat.en, cat.order]
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
    throw new FoodError(ERR.NUTRITION_NOT_FINITE);
  }
  if (kcal < 0 || protein < 0 || carb < 0 || fat < 0) {
    throw new FoodError(ERR.NUTRITION_NEGATIVE);
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
  if (!input.name?.trim()) throw new FoodError(ERR.EMPTY_FOOD_NAME);
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
  if (!input.name?.trim()) throw new FoodError(ERR.EMPTY_FOOD_NAME);
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
    throw new FoodError(ERR.FOOD_IN_USE);
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
  zh: string;
  en: string;
  category_zh: string; // 分类定位固定用中文名（与 SEED_CATEGORIES.zh 对应）
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  gi?: number | null;
  notes_zh?: string;
  notes_en?: string;
}

export const SEED_FOODS: SeedFood[] = [
  // 碳水
  { zh: '燕麦片', en: 'Rolled Oats', category_zh: '碳水', kcal: 389, protein: 16.9, carb: 66.9, fat: 6.9, gi: 55, notes_zh: '低 GI，富含 β-葡聚糖', notes_en: 'Low GI, rich in beta-glucan' },
  { zh: '糙米', en: 'Brown Rice', category_zh: '碳水', kcal: 348, protein: 7.7, carb: 77.9, fat: 2.7, gi: 56 },
  { zh: '全麦面包', en: 'Whole Wheat Bread', category_zh: '碳水', kcal: 246, protein: 8.5, carb: 48.4, fat: 3.6, gi: 49, notes_zh: '低 GI', notes_en: 'Low GI' },
  { zh: '红薯', en: 'Sweet Potato', category_zh: '碳水', kcal: 86, protein: 1.6, carb: 20.1, fat: 0.1, gi: 70 },
  { zh: '紫薯', en: 'Purple Sweet Potato', category_zh: '碳水', kcal: 82, protein: 1.2, carb: 18.9, fat: 0.2, gi: 77 },
  { zh: '藜麦', en: 'Quinoa', category_zh: '碳水', kcal: 368, protein: 14.1, carb: 64.2, fat: 6.1, gi: 53, notes_zh: '低 GI，完全蛋白', notes_en: 'Low GI, complete protein' },
  { zh: '白米饭', en: 'White Rice', category_zh: '碳水', kcal: 116, protein: 2.6, carb: 25.9, fat: 0.3, gi: 73 },
  { zh: '意大利面（全麦）', en: 'Whole Wheat Pasta', category_zh: '碳水', kcal: 324, protein: 12.5, carb: 62.7, fat: 1.8, gi: 48, notes_zh: '低 GI', notes_en: 'Low GI' },

  // 蛋白质
  { zh: '鸡胸肉', en: 'Chicken Breast', category_zh: '蛋白质', kcal: 165, protein: 31, carb: 0, fat: 3.6 },
  { zh: '鸡蛋', en: 'Egg', category_zh: '蛋白质', kcal: 155, protein: 13, carb: 1.1, fat: 11 },
  { zh: '三文鱼', en: 'Salmon', category_zh: '蛋白质', kcal: 208, protein: 20, carb: 0, fat: 13, notes_zh: '富含 Ω-3', notes_en: 'Rich in omega-3' },
  { zh: '牛肉（瘦）', en: 'Lean Beef', category_zh: '蛋白质', kcal: 250, protein: 26, carb: 0, fat: 15 },
  { zh: '虾', en: 'Shrimp', category_zh: '蛋白质', kcal: 99, protein: 24, carb: 0.2, fat: 0.3 },
  { zh: '豆腐', en: 'Tofu', category_zh: '蛋白质', kcal: 81, protein: 8.1, carb: 3.8, fat: 3.7 },
  { zh: '希腊酸奶', en: 'Greek Yogurt', category_zh: '蛋白质', kcal: 59, protein: 10, carb: 3.6, fat: 0.4 },
  { zh: '鳕鱼', en: 'Cod', category_zh: '蛋白质', kcal: 105, protein: 23, carb: 0, fat: 0.9 },

  // 脂肪
  { zh: '牛油果', en: 'Avocado', category_zh: '脂肪', kcal: 160, protein: 2, carb: 8.5, fat: 14.7, notes_zh: '单不饱和脂肪酸', notes_en: 'Monounsaturated fats' },
  { zh: '杏仁', en: 'Almonds', category_zh: '脂肪', kcal: 579, protein: 21, carb: 22, fat: 50.6 },
  { zh: '橄榄油', en: 'Olive Oil', category_zh: '脂肪', kcal: 899, protein: 0, carb: 0, fat: 99.9 },
  { zh: '奇亚籽', en: 'Chia Seeds', category_zh: '脂肪', kcal: 486, protein: 16, carb: 42, fat: 30.7, notes_zh: 'Ω-3 + 膳食纤维', notes_en: 'Omega-3 + fiber' },

  // 抗氧化蔬菜
  { zh: '菠菜', en: 'Spinach', category_zh: '抗氧化蔬菜', kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4, notes_zh: '叶黄素/玉米黄质', notes_en: 'Lutein / zeaxanthin' },
  { zh: '西兰花', en: 'Broccoli', category_zh: '抗氧化蔬菜', kcal: 34, protein: 2.8, carb: 7, fat: 0.4, notes_zh: '萝卜硫素', notes_en: 'Sulforaphane' },
  { zh: '蓝莓', en: 'Blueberries', category_zh: '抗氧化蔬菜', kcal: 57, protein: 0.7, carb: 14.5, fat: 0.3, notes_zh: '花青素', notes_en: 'Anthocyanins' },
  { zh: '番茄', en: 'Tomato', category_zh: '抗氧化蔬菜', kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2, notes_zh: '番茄红素', notes_en: 'Lycopene' },
  { zh: '胡萝卜', en: 'Carrot', category_zh: '抗氧化蔬菜', kcal: 41, protein: 0.9, carb: 9.6, fat: 0.2, notes_zh: 'β-胡萝卜素', notes_en: 'Beta-carotene' },
  { zh: '紫甘蓝', en: 'Red Cabbage', category_zh: '抗氧化蔬菜', kcal: 31, protein: 1.4, carb: 7.8, fat: 0.2, notes_zh: '花青素', notes_en: 'Anthocyanins' },

  // 膳食纤维
  { zh: '奇亚籽', en: 'Chia Seeds', category_zh: '膳食纤维', kcal: 486, protein: 16, carb: 42, fat: 30.7, notes_zh: '10g 纤维/100g', notes_en: '10g fiber/100g' },
  { zh: '燕麦片', en: 'Rolled Oats', category_zh: '膳食纤维', kcal: 389, protein: 16.9, carb: 66.9, fat: 6.9 },
  { zh: '扁豆', en: 'Lentils', category_zh: '膳食纤维', kcal: 353, protein: 25, carb: 63, fat: 0.4 },
  { zh: '西兰花', en: 'Broccoli', category_zh: '膳食纤维', kcal: 34, protein: 2.8, carb: 7, fat: 0.4 },
  { zh: '菠菜', en: 'Spinach', category_zh: '膳食纤维', kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4 },
];

export async function ensureSeedFoods(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<ItemRow>('SELECT * FROM food_item');
  if (existing.length > 0) return;

  const cats = await listCategories();
  const locale = getLocale();
  const catMap = new Map(cats.map((c) => [c.name, c.id]));
  // 分类定位：种子分类的 zh/en 名都可能已入库（取决于首启 locale），任一命中即可
  const idByZh = new Map(SEED_CATEGORIES.map((c) => [c.zh, catMap.get(c.zh)]));
  const idByEn = new Map(SEED_CATEGORIES.map((c) => [c.en, catMap.get(c.en)]));

  for (const seed of SEED_FOODS) {
    const catId = idByZh.get(seed.category_zh) ?? idByEn.get(seed.category_zh);
    if (catId === undefined) continue;
    await db.runAsync(
      `INSERT INTO food_item
       (name, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        locale === 'zh' ? seed.zh : seed.en,
        catId,
        seed.kcal,
        seed.protein,
        seed.carb,
        seed.fat,
        seed.gi ?? null,
        (locale === 'zh' ? seed.notes_zh : seed.notes_en) ?? '',
        nowString(),
      ]
    );
  }
}
