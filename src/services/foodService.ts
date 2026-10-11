// 食物分类与条目 CRUD + 种子数据

import { getDb, nowString } from '../db/database';
import { BizError, ERR } from './errors';
import { getLocale, type TranslationKey } from '../i18n';
import { countIntakeByFoodItem } from './intakeService';
import type { FoodCategory, FoodItem, FoodPortion } from '../types';

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
  name_en: string | null;
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi: number | null;
  notes: string;
  notes_en: string | null;
  portions: string | null;
  updated_at: string | null;
}

function mapCatRow(r: CatRow): FoodCategory {
  return { id: r.id, name: r.name, sort_order: r.sort_order };
}

// portions JSON 容错解析：非法/空 → null
export function parsePortions(json: string | null): FoodPortion[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json) as FoodPortion[];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    if (arr.some((p) => !p || typeof p.grams !== 'number' || p.grams <= 0)) return null;
    return arr;
  } catch {
    return null;
  }
}

function mapItemRow(r: ItemRow): FoodItem {
  return {
    id: r.id,
    name: r.name,
    name_en: r.name_en,
    category_id: r.category_id,
    kcal_per_100g: r.kcal_per_100g,
    protein_per_100g: r.protein_per_100g,
    carb_per_100g: r.carb_per_100g,
    fat_per_100g: r.fat_per_100g,
    gi: r.gi,
    notes: r.notes,
    notes_en: r.notes_en,
    portions: parsePortions(r.portions),
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
export const SEED_CATEGORIES: { zh: string; en: string; order: number }[] = [
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
  name_en?: string | null;
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi?: number | null;
  notes?: string;
  notes_en?: string | null;
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
     (name, name_en, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, notes_en, portions, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.name_en ?? null,
      input.category_id,
      input.kcal_per_100g,
      input.protein_per_100g,
      input.carb_per_100g,
      input.fat_per_100g,
      input.gi ?? null,
      input.notes ?? '',
      input.notes_en ?? null,
      null, // 自定义食物无生活化份量预设
      time,
    ]
  );
  return {
    id: Number(res.lastInsertRowId),
    name: input.name.trim(),
    name_en: input.name_en ?? null,
    category_id: input.category_id,
    kcal_per_100g: input.kcal_per_100g,
    protein_per_100g: input.protein_per_100g,
    carb_per_100g: input.carb_per_100g,
    fat_per_100g: input.fat_per_100g,
    gi: input.gi ?? null,
    notes: input.notes ?? '',
    notes_en: input.notes_en ?? null,
    portions: null,
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

// ============ 双语显示（纯函数，vitest 可测） ============

// 按当前 locale 选取显示名：zh → name；en → name_en（缺失回退 name）
export function foodDisplayName(
  item: Pick<FoodItem, 'name' | 'name_en'>,
  locale: 'zh' | 'en' = getLocale()
): string {
  if (locale === 'en') return item.name_en ?? item.name;
  return item.name;
}

// 按当前 locale 选取显示备注：zh → notes；en → notes_en（缺失回退 notes）
export function foodDisplayNotes(
  item: Pick<FoodItem, 'notes' | 'notes_en'>,
  locale: 'zh' | 'en' = getLocale()
): string {
  if (locale === 'en') return item.notes_en ?? item.notes;
  return item.notes;
}

// 生活化份量标签按 locale 选取
export function foodPortionLabel(
  p: Pick<FoodPortion, 'zh' | 'en'>,
  locale: 'zh' | 'en' = getLocale()
): string {
  return locale === 'en' ? p.en : p.zh;
}

// ============ 语义化营养标签与搜索（纯函数，vitest 可测） ============

// 种子分类的规范类别（zh/en 库名 → canonical），自定义分类返回 null
export type CatKind = 'carb' | 'protein' | 'fat' | 'fiber' | 'antioxidant';

const CANONICAL_BY_NAME: Record<string, CatKind> = {
  碳水: 'carb',
  Carbs: 'carb',
  蛋白质: 'protein',
  Protein: 'protein',
  脂肪: 'fat',
  Fats: 'fat',
  膳食纤维: 'fiber',
  Fiber: 'fiber',
  抗氧化蔬菜: 'antioxidant',
  'Antioxidant Veggies': 'antioxidant',
};

export function canonicalCatKind(name: string): CatKind | null {
  return CANONICAL_BY_NAME[name] ?? null;
}

export type FoodTagKey =
  | 'highProtein'
  | 'healthyFats'
  | 'complexCarb'
  | 'highFiber'
  | 'antioxidant'
  | 'zeroCarb'
  | 'lowGi';

// 派生规则（最多返回 2 个，按优先级截断）：
// protein≥20 High Protein；fat≥10 Healthy Fats；碳水分类且 carb≥20 Complex Carb；
// 纤维分类 High Fiber；抗氧化分类 Antioxidant；carb=0 Zero Carb；GI≤55 Low GI
export function foodTags(
  item: Pick<
    FoodItem,
    'protein_per_100g' | 'carb_per_100g' | 'fat_per_100g' | 'gi'
  >,
  catKind: CatKind | null
): FoodTagKey[] {
  const tags: FoodTagKey[] = [];
  if (item.protein_per_100g >= 20) tags.push('highProtein');
  if (item.fat_per_100g >= 10) tags.push('healthyFats');
  if (catKind === 'carb' && item.carb_per_100g >= 20) tags.push('complexCarb');
  if (catKind === 'fiber') tags.push('highFiber');
  if (catKind === 'antioxidant') tags.push('antioxidant');
  if (item.carb_per_100g === 0) tags.push('zeroCarb');
  if (isLowGI(item.gi)) tags.push('lowGi');
  return tags.slice(0, 2);
}

// 名称搜索（大小写不敏感，中文名 name 与英文名 name_en 均参与匹配）+ 分类筛选叠加；结果保持传入顺序
export function filterFoods(
  items: FoodItem[],
  query: string,
  categoryId: number | null
): FoodItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((f) => {
    if (categoryId !== null && f.category_id !== categoryId) return false;
    if (
      q &&
      !f.name.toLowerCase().includes(q) &&
      !(f.name_en ?? '').toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

// ============ 种子食物 ============
// 精选高营养密度数据集（Nutrient-Dense Foods）：欧美市场高认可度，四维度
// 高优质蛋白 / 优质脂肪 / 优质复合碳水 / 纤维与抗氧化

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
  portions?: FoodPortion[];
}

export const SEED_FOODS: SeedFood[] = [
  // —— 高优质蛋白质（蛋白质）——
  { zh: '鸡胸肉', en: 'Chicken Breast', category_zh: '蛋白质', kcal: 165, protein: 31, carb: 0, fat: 3.6, portions: [{ zh: '1 掌心大小', en: '1 Palm', grams: 100 }, { zh: '1 块鸡胸', en: '1 Breast Fillet', grams: 150 }], notes_zh: '极致低脂高蛋白，减脂增肌首选', notes_en: 'Ultra-lean protein, top pick for cutting' },
  { zh: '野生三文鱼', en: 'Wild Salmon', category_zh: '蛋白质', kcal: 206, protein: 22, carb: 0, fat: 12, portions: [{ zh: '1 掌心大小', en: '1 Palm', grams: 100 }, { zh: '1 块鱼排', en: '1 Fillet', grams: 150 }], notes_zh: '富含 Ω-3（rTG），护心护脑', notes_en: 'rTG omega-3 for heart & brain' },
  { zh: '蛋白（鸡蛋清）', en: 'Egg Whites', category_zh: '蛋白质', kcal: 52, protein: 11, carb: 0.7, fat: 0.2, portions: [{ zh: '1 份蛋清', en: '1 Egg White', grams: 30 }], notes_zh: '纯净蛋白质，极低热量负担', notes_en: 'Pure protein, minimal calories' },
  { zh: '希腊酸奶（0% 脂肪）', en: 'Greek Yogurt (0% Fat)', category_zh: '蛋白质', kcal: 59, protein: 10, carb: 3.6, fat: 0.4, portions: [{ zh: '1 单杯装', en: '1 Container', grams: 150 }, { zh: '1 杯', en: '1 Cup', grams: 245 }], notes_zh: '益生菌 + 酪蛋白长效饱腹', notes_en: 'Probiotics + casein for satiety' },
  { zh: '老豆腐', en: 'Tofu (Firm)', category_zh: '蛋白质', kcal: 144, protein: 17, carb: 2.8, fat: 8.8, notes_zh: '植物蛋白，富含大豆异黄酮与钙', notes_en: 'Plant protein with isoflavones & calcium' },
  { zh: '鸡蛋', en: 'Egg', category_zh: '蛋白质', kcal: 155, protein: 13, carb: 1.1, fat: 11, portions: [{ zh: '1 个大号鸡蛋', en: '1 Large Egg', grams: 50 }], notes_zh: '全营养天然食物', notes_en: "Nature's multivitamin" },
  { zh: '虾', en: 'Shrimp', category_zh: '蛋白质', kcal: 99, protein: 24, carb: 0.2, fat: 0.3, notes_zh: '高蛋白低脂海鲜', notes_en: 'Lean seafood protein' },

  // —— 优质健康脂肪（脂肪）——
  { zh: '牛油果', en: 'Avocado', category_zh: '脂肪', kcal: 160, protein: 2, carb: 8.5, fat: 14.7, portions: [{ zh: '半个中等牛油果', en: '1/2 Medium Avocado', grams: 100 }, { zh: '1 整个牛油果', en: '1 Whole Avocado', grams: 200 }], notes_zh: '单不饱和脂肪酸（MUFA）+ 6.7g 纤维', notes_en: 'MUFA fats + 6.7g fiber' },
  { zh: '特级初榨橄榄油', en: 'Extra Virgin Olive Oil', category_zh: '脂肪', kcal: 884, protein: 0, carb: 0, fat: 100, portions: [{ zh: '1 汤匙', en: '1 Tbsp', grams: 14 }, { zh: '1 茶匙', en: '1 Tsp', grams: 4.5 }], notes_zh: '橄榄多酚抗氧化，地中海饮食核心', notes_en: 'Polyphenols, Mediterranean staple' },
  { zh: '大杏仁', en: 'Almonds', category_zh: '脂肪', kcal: 579, protein: 21, carb: 21.6, fat: 49.9, portions: [{ zh: '1 小把', en: '1 Handful', grams: 30 }, { zh: '10 粒', en: '10 Almonds', grams: 12 }], notes_zh: '维生素 E 与镁，优质油脂', notes_en: 'Vitamin E & magnesium' },
  { zh: '奇亚籽', en: 'Chia Seeds', category_zh: '脂肪', kcal: 486, protein: 16.5, carb: 42.1, fat: 30.7, notes_zh: '植物 Ω-3（ALA）+ 34g 膳食纤维', notes_en: 'Plant omega-3 (ALA) + 34g fiber' },
  { zh: '核桃', en: 'Walnuts', category_zh: '脂肪', kcal: 654, protein: 15.2, carb: 13.7, fat: 65.2, notes_zh: '植物 Ω-3 与多酚', notes_en: 'Plant omega-3 & polyphenols' },

  // —— 优质复合碳水（碳水）——
  { zh: '红薯', en: 'Sweet Potato', category_zh: '碳水', kcal: 86, protein: 1.6, carb: 20.1, fat: 0.1, gi: 70, portions: [{ zh: '1 个中等大小', en: '1 Medium Potato', grams: 150 }, { zh: '1 个拳头大小', en: '1 Fist Size', grams: 100 }], notes_zh: '慢碳 + β-胡萝卜素（维生素 A）', notes_en: 'Slow carbs + beta-carotene' },
  { zh: '燕麦片', en: 'Rolled Oats', category_zh: '碳水', kcal: 389, protein: 16.9, carb: 66.3, fat: 6.9, gi: 55, portions: [{ zh: '1/2 杯（干）', en: '1/2 Cup Dry', grams: 40 }, { zh: '1 杯（干）', en: '1 Cup Dry', grams: 80 }], notes_zh: 'β-葡聚糖平稳血糖', notes_en: 'Beta-glucan for steady glucose' },
  { zh: '藜麦', en: 'Quinoa', category_zh: '碳水', kcal: 120, protein: 4.4, carb: 21.3, fat: 1.9, gi: 53, portions: [{ zh: '1/2 碗（熟）', en: '1/2 Cup Cooked', grams: 90 }, { zh: '1 碗（熟）', en: '1 Cup Cooked', grams: 185 }], notes_zh: '全价蛋白，含 9 种必需氨基酸', notes_en: 'Complete amino-acid profile' },
  { zh: '糙米', en: 'Brown Rice', category_zh: '碳水', kcal: 348, protein: 7.7, carb: 77.9, fat: 2.7, gi: 56, notes_zh: '保留麸皮的全谷物', notes_en: 'Whole grain with bran intact' },
  { zh: '全麦面包', en: 'Whole Wheat Bread', category_zh: '碳水', kcal: 246, protein: 8.5, carb: 48.4, fat: 3.6, gi: 49, portions: [{ zh: '1 片', en: '1 Slice', grams: 35 }], notes_zh: '低 GI 全麦主食', notes_en: 'Low GI whole-grain staple' },
  { zh: '意大利面（全麦）', en: 'Whole Wheat Pasta', category_zh: '碳水', kcal: 324, protein: 12.5, carb: 62.7, fat: 1.8, gi: 48, notes_zh: '低 GI 训练主食', notes_en: 'Low GI training fuel' },

  // —— 膳食纤维（膳食纤维）——
  { zh: '扁豆', en: 'Lentils', category_zh: '膳食纤维', kcal: 353, protein: 25, carb: 63, fat: 0.4, notes_zh: '高蛋白高纤维双料选手', notes_en: 'Protein + fiber powerhouse' },
  { zh: '覆盆子', en: 'Raspberries', category_zh: '膳食纤维', kcal: 52, protein: 1.2, carb: 11.9, fat: 0.7, notes_zh: '6.5g 纤维/100g，低糖高纤', notes_en: '6.5g fiber per 100g, low sugar' },
  { zh: '梨', en: 'Pear', category_zh: '膳食纤维', kcal: 57, protein: 0.4, carb: 15.2, fat: 0.1, notes_zh: '果胶丰富，高水分饱腹', notes_en: 'Pectin fiber, hydrating' },
  { zh: '90% 黑巧', en: 'Dark Chocolate (90%)', category_zh: '膳食纤维', kcal: 598, protein: 7.8, carb: 42.6, fat: 45.9, portions: [{ zh: '1 小块', en: '1 Square', grams: 10 }, { zh: '2 小块', en: '2 Squares', grams: 20 }], notes_zh: '黄烷醇护心血管，抗炎首选', notes_en: 'Flavanols for heart & inflammation' },

  // —— 纤维与抗氧化（抗氧化蔬菜）——
  { zh: '蓝莓', en: 'Blueberries', category_zh: '抗氧化蔬菜', kcal: 57, protein: 0.7, carb: 14.5, fat: 0.3, portions: [{ zh: '1 满把', en: '1 Handful', grams: 75 }, { zh: '1 杯', en: '1 Cup', grams: 150 }], notes_zh: '花青素抗氧化第一线，护眼护脑', notes_en: 'Anthocyanin antioxidant boost' },
  { zh: '西兰花', en: 'Broccoli', category_zh: '抗氧化蔬菜', kcal: 34, protein: 2.8, carb: 7, fat: 0.4, portions: [{ zh: '1 杯切件', en: '1 Cup Chopped', grams: 90 }], notes_zh: '萝卜硫素抗癌抗炎，富含维 C', notes_en: 'Sulforaphane, rich in vitamin C' },
  { zh: '菠菜', en: 'Spinach', category_zh: '抗氧化蔬菜', kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4, portions: [{ zh: '2 杯生菠菜', en: '2 Cups Raw', grams: 60 }], notes_zh: '叶黄素 + 铁，护眼补血', notes_en: 'Lutein & iron for eyes and blood' },
  { zh: '番茄', en: 'Tomato', category_zh: '抗氧化蔬菜', kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2, notes_zh: '番茄红素，护心抗氧化', notes_en: 'Lycopene for heart health' },
];

export async function ensureSeedFoods(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<ItemRow>('SELECT * FROM food_item');
  if (existing.length > 0) {
    // 升级回填：旧版本种子食物无 portions（种子仅在库空时写入）。
    // 按中文 canonical 名匹配（种子 name 固定中文双写），只填 NULL 不覆盖
    for (const seed of SEED_FOODS) {
      if (!seed.portions) continue;
      await db.runAsync(
        'UPDATE food_item SET portions = ? WHERE name = ? AND portions IS NULL',
        [JSON.stringify(seed.portions), seed.zh]
      );
    }
    return;
  }

  const cats = await listCategories();
  // 分类定位：种子分类的 zh/en 名都可能已入库（取决于首启 locale），任一命中即可
  const catMap = new Map(cats.map((c) => [c.name, c.id]));
  const idByZh = new Map(SEED_CATEGORIES.map((c) => [c.zh, catMap.get(c.zh)]));
  const idByEn = new Map(SEED_CATEGORIES.map((c) => [c.en, catMap.get(c.en)]));

  for (const seed of SEED_FOODS) {
    const catId = idByZh.get(seed.category_zh) ?? idByEn.get(seed.category_zh);
    if (catId === undefined) continue;
    // 双语双写：name 固定中文 canonical，name_en 存英文，显示层按 locale 选取
    await db.runAsync(
      `INSERT INTO food_item
       (name, name_en, category_id, kcal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, gi, notes, notes_en, portions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seed.zh,
        seed.en,
        catId,
        seed.kcal,
        seed.protein,
        seed.carb,
        seed.fat,
        seed.gi ?? null,
        seed.notes_zh ?? '',
        seed.notes_en ?? null,
        seed.portions ? JSON.stringify(seed.portions) : null,
        nowString(),
      ]
    );
  }
}
