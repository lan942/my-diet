// 食物库重构测试：种子数据集完整性、foodTags 派生、filterFoods 搜索、Quick Log 纯逻辑

import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-11 12:00:00',
  todayString: () => '2026-10-11',
}));

import {
  SEED_FOODS,
  SEED_CATEGORIES,
  ensureSeedFoods,
  PORTION_BACKFILL_V180,
  foodTags,
  filterFoods,
  foodDisplayName,
  foodDisplayNotes,
  foodPortionLabel,
  parsePortions,
  canonicalCatKind,
} from '../src/services/foodService';
import { getDb } from '../src/db/database';
import { defaultMealFor, scaleNutrition } from '../src/services/intakeService';
import type { FoodItem } from '../src/types';

const mockedGetDb = vi.mocked(getDb);

function fixture(partial: Partial<FoodItem>): FoodItem {
  return {
    id: 1,
    name: 'test',
    name_en: null,
    category_id: 1,
    kcal_per_100g: 100,
    protein_per_100g: 10,
    carb_per_100g: 10,
    fat_per_100g: 10,
    gi: null,
    notes: '',
    notes_en: null,
    portions: null,
    updated_at: null,
    ...partial,
  };
}

describe('种子数据集完整性（精选高营养密度数据集）', () => {
  it('约 52 条食物（49-53 之间，含中国家常批次）', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(49);
    expect(SEED_FOODS.length).toBeLessThanOrEqual(53);
  });

  it('每条种子均有营养亮点备注', () => {
    for (const s of SEED_FOODS) {
      expect(s.notes_zh?.length ?? 0).toBeGreaterThan(0);
      expect(s.notes_en?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('关键营养值与数据集一致', () => {
    const byZh = new Map(SEED_FOODS.map((s) => [s.zh, s]));
    const chicken = byZh.get('鸡胸肉')!;
    expect([chicken.kcal, chicken.protein, chicken.fat, chicken.carb]).toEqual([165, 31, 3.6, 0]);
    const salmon = byZh.get('野生三文鱼')!;
    expect([salmon.kcal, salmon.protein, salmon.fat, salmon.carb]).toEqual([206, 22, 12, 0]);
    const chia = byZh.get('奇亚籽')!;
    expect([chia.kcal, chia.protein, chia.fat, chia.carb]).toEqual([486, 16.5, 30.7, 42.1]);
  });

  it('无重复（名称 + 分类）组合，消除旧库双分类重复行', () => {
    const seen = new Set<string>();
    for (const s of SEED_FOODS) {
      const key = `${s.en}::${s.category_zh}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('每条种子的分类均在种子分类列表内', () => {
    const valid = new Set(SEED_CATEGORIES.map((c) => c.zh));
    for (const s of SEED_FOODS) {
      expect(valid.has(s.category_zh)).toBe(true);
    }
  });

  it('双语数据完整：每条种子均有英文名与英文备注（双写）', () => {
    for (const s of SEED_FOODS) {
      expect(s.en.length).toBeGreaterThan(0);
      expect(s.notes_en?.length ?? 0).toBeGreaterThan(0);
      expect(s.notes_zh?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('gi 仅出现在碳水分类（低 GI 标注语义限定）', () => {
    for (const s of SEED_FOODS) {
      if (s.gi != null) {
        expect(s.category_zh).toBe('碳水');
      }
    }
  });

  it('白米饭：碳水分类熟重口径，gi=73', () => {
    const rice = SEED_FOODS.find((s) => s.zh === '白米饭')!;
    expect(rice).toBeDefined();
    expect(rice.en).toBe('White Rice (Cooked)');
    expect(rice.category_zh).toBe('碳水');
    expect([rice.kcal, rice.protein, rice.fat, rice.carb]).toEqual([116, 2.6, 0.3, 25.9]);
    expect(rice.gi).toBe(73);
  });

  it('鹰嘴豆：膳食纤维分类熟重口径，无 gi 字段', () => {
    const chickpea = SEED_FOODS.find((s) => s.zh === '鹰嘴豆')!;
    expect(chickpea).toBeDefined();
    expect(chickpea.en).toBe('Chickpeas (Cooked)');
    expect(chickpea.category_zh).toBe('膳食纤维');
    expect([chickpea.kcal, chickpea.protein, chickpea.fat, chickpea.carb]).toEqual([
      164, 8.9, 2.6, 27.4,
    ]);
    expect(chickpea.gi).toBeUndefined();
  });
});

describe('中国家常食物数据集', () => {
  it('19 条家常种子全部在库且分类分布正确', () => {
    const zhNames = [
      '馒头',
      '面条（煮熟）',
      '白粥（大米）',
      '鲜玉米',
      '猪肉白菜水饺（熟）',
      '猪里脊（生）',
      '五花肉（生）',
      '鸡腿（带皮）',
      '瘦牛肉（生）',
      '无糖豆浆',
      '花生（炒）',
      '花生油',
      '黄瓜',
      '大白菜',
      '茄子',
      '青椒（菜椒）',
      '橙子',
      '西瓜',
      '桃子',
    ];
    const byZh = new Map(SEED_FOODS.map((s) => [s.zh, s]));
    for (const n of zhNames) {
      expect(byZh.has(n)).toBe(true);
    }
    expect(byZh.get('馒头')!.category_zh).toBe('碳水');
    expect(byZh.get('猪里脊（生）')!.category_zh).toBe('蛋白质');
    expect(byZh.get('花生油')!.category_zh).toBe('脂肪');
    expect(byZh.get('大白菜')!.category_zh).toBe('抗氧化蔬菜');
    expect(byZh.get('橙子')!.category_zh).toBe('膳食纤维');
  });

  it('家常主食营养值口径：馒头高 GI、白粥熟重', () => {
    const byZh = new Map(SEED_FOODS.map((s) => [s.zh, s]));
    const bun = byZh.get('馒头')!;
    expect([bun.kcal, bun.protein, bun.carb, bun.fat]).toEqual([223, 7, 47, 1.1]);
    expect(bun.gi).toBe(88);
    const congee = byZh.get('白粥（大米）')!;
    expect([congee.kcal, congee.protein, congee.carb, congee.fat]).toEqual([46, 1.1, 9.9, 0.3]);
    expect(congee.gi).toBe(69);
    expect(congee.notes_zh).toContain('熟重');
  });

  it('家常蛋白营养值口径：里脊低脂、五花肉高脂如实录入', () => {
    const byZh = new Map(SEED_FOODS.map((s) => [s.zh, s]));
    const loin = byZh.get('猪里脊（生）')!;
    expect([loin.kcal, loin.protein, loin.carb, loin.fat]).toEqual([155, 20.2, 0.7, 7.9]);
    const belly = byZh.get('五花肉（生）')!;
    expect([belly.kcal, belly.protein, belly.carb, belly.fat]).toEqual([518, 7.7, 0.9, 53]);
    expect(belly.notes_zh).toContain('适量');
  });

  it('水果种子不带 gi（低 GI 标签语义限定碳水分类）', () => {
    for (const zh of ['橙子', '西瓜', '桃子']) {
      const fruit = SEED_FOODS.find((s) => s.zh === zh)!;
      expect(fruit.gi ?? null).toBeNull();
    }
  });
});

describe('foodTags 语义化营养标签派生', () => {
  it('鸡胸肉：High Protein + Zero Carb', () => {
    const tags = foodTags(
      { protein_per_100g: 31, carb_per_100g: 0, fat_per_100g: 3.6, gi: null },
      'protein'
    );
    expect(tags).toEqual(['highProtein', 'zeroCarb']);
  });

  it('燕麦片：Complex Carb + Low GI', () => {
    const tags = foodTags(
      { protein_per_100g: 16.9, carb_per_100g: 66.3, fat_per_100g: 6.9, gi: 55 },
      'carb'
    );
    expect(tags).toEqual(['complexCarb', 'lowGi']);
  });

  it('自定义高蛋白食物参与派生', () => {
    const tags = foodTags(
      { protein_per_100g: 25, carb_per_100g: 5, fat_per_100g: 4, gi: null },
      null
    );
    expect(tags).toEqual(['highProtein']);
  });

  it('边界值：protein 19.9 不打 High Protein 标签', () => {
    const tags = foodTags(
      { protein_per_100g: 19.9, carb_per_100g: 5, fat_per_100g: 4, gi: null },
      null
    );
    expect(tags).not.toContain('highProtein');
  });

  it('最多返回 2 个标签（90% 黑巧：Healthy Fats + High Fiber）', () => {
    const tags = foodTags(
      { protein_per_100g: 7.8, carb_per_100g: 42.6, fat_per_100g: 45.9, gi: null },
      'fiber'
    );
    expect(tags).toEqual(['healthyFats', 'highFiber']);
  });

  it('低营养密度且无分类命中时返回空数组', () => {
    const tags = foodTags(
      { protein_per_100g: 2.9, carb_per_100g: 3.6, fat_per_100g: 0.4, gi: null },
      null
    );
    expect(tags).toEqual([]);
  });
});

describe('filterFoods 搜索与分类叠加', () => {
  const items: FoodItem[] = [
    fixture({ id: 1, name: 'Chicken Breast', category_id: 2 }),
    fixture({ id: 2, name: '鸡胸肉', category_id: 2 }),
    fixture({ id: 3, name: 'Cod', category_id: 2 }),
    fixture({ id: 4, name: 'Rolled Oats', category_id: 1 }),
  ];

  it('英文关键字命中（大小写不敏感）', () => {
    expect(filterFoods(items, 'CHICK', null).map((f) => f.id)).toEqual([1]);
  });

  it('中文关键字命中', () => {
    expect(filterFoods(items, '鸡', null).map((f) => f.id)).toEqual([2]);
  });

  it('搜索与分类筛选叠加', () => {
    expect(filterFoods(items, 'oat', 1).map((f) => f.id)).toEqual([4]);
    expect(filterFoods(items, 'oat', 2)).toEqual([]);
  });

  it('无结果返回空数组', () => {
    expect(filterFoods(items, 'pizza', null)).toEqual([]);
  });

  it('首尾空白被忽略', () => {
    expect(filterFoods(items, '  chick  ', null).map((f) => f.id)).toEqual([1]);
  });

  it('空关键字仅按分类过滤', () => {
    expect(filterFoods(items, '', 2).length).toBe(3);
  });

  it('英文名 name_en 参与匹配（种子数据 name 为中文，en 系统搜英文名需命中）', () => {
    const bilingual = [
      fixture({ id: 1, name: '鸡胸肉', name_en: 'Chicken Breast', category_id: 2 }),
    ];
    expect(filterFoods(bilingual, 'chick', null).map((f) => f.id)).toEqual([1]);
    expect(filterFoods(bilingual, 'CHICKEN', null).map((f) => f.id)).toEqual([1]);
    expect(filterFoods(bilingual, '鸡', null).map((f) => f.id)).toEqual([1]);
    expect(filterFoods(bilingual, 'salmon', null)).toEqual([]);
  });
});

describe('canonicalCatKind 分类名规范化', () => {
  it('zh/en 库名均可命中种子分类', () => {
    expect(canonicalCatKind('碳水')).toBe('carb');
    expect(canonicalCatKind('Carbs')).toBe('carb');
    expect(canonicalCatKind('蛋白质')).toBe('protein');
    expect(canonicalCatKind('Protein')).toBe('protein');
    expect(canonicalCatKind('膳食纤维')).toBe('fiber');
    expect(canonicalCatKind('Antioxidant Veggies')).toBe('antioxidant');
  });

  it('自定义分类返回 null', () => {
    expect(canonicalCatKind('My Custom')).toBeNull();
  });
});

describe('双语显示函数', () => {
  const bilingual = fixture({
    name: '全麦面包',
    name_en: 'Whole Wheat Bread',
    notes: '低 GI 全麦主食',
    notes_en: 'Low GI whole-grain staple',
  });
  const custom = fixture({ name: '妈妈牌卤牛肉', name_en: null, notes: '家传配方', notes_en: null });

  it('zh locale 显示中文名与中文备注', () => {
    expect(foodDisplayName(bilingual, 'zh')).toBe('全麦面包');
    expect(foodDisplayNotes(bilingual, 'zh')).toBe('低 GI 全麦主食');
  });

  it('en locale 显示英文名与英文备注', () => {
    expect(foodDisplayName(bilingual, 'en')).toBe('Whole Wheat Bread');
    expect(foodDisplayNotes(bilingual, 'en')).toBe('Low GI whole-grain staple');
  });

  it('en 缺失时回退 name/notes', () => {
    expect(foodDisplayName(custom, 'en')).toBe('妈妈牌卤牛肉');
    expect(foodDisplayNotes(custom, 'en')).toBe('家传配方');
  });
});

describe('生活化份量（Household Portions）', () => {
  it('常见种子食物均有合法份量预设', () => {
    const withPortions = SEED_FOODS.filter((s) => s.portions && s.portions.length > 0);
    expect(withPortions.length).toBeGreaterThanOrEqual(14);
    for (const s of withPortions) {
      for (const p of s.portions!) {
        expect(p.zh.length).toBeGreaterThan(0);
        expect(p.en.length).toBeGreaterThan(0);
        expect(p.grams).toBeGreaterThan(0);
      }
    }
  });

  it('鸡胸肉预设锚点为掌心 100g 与 1 块 150g', () => {
    const chicken = SEED_FOODS.find((s) => s.zh === '鸡胸肉')!;
    expect(chicken.portions!.map((p) => p.grams)).toEqual([100, 150]);
    expect(chicken.portions![0].en).toBe('1 Palm');
  });

  it('白米饭预设锚点为半碗 75g 与一碗 150g（熟）', () => {
    const rice = SEED_FOODS.find((s) => s.zh === '白米饭')!;
    expect(rice.portions!.map((p) => p.grams)).toEqual([75, 150]);
    expect(rice.portions!.map((p) => p.zh)).toEqual(['1/2 碗（熟）', '1 碗（熟）']);
    expect(rice.portions!.map((p) => p.en)).toEqual(['1/2 Bowl Cooked', '1 Bowl Cooked']);
  });

  it('鹰嘴豆预设锚点为半杯 80g 与一杯 160g（熟）', () => {
    const chickpea = SEED_FOODS.find((s) => s.zh === '鹰嘴豆')!;
    expect(chickpea.portions!.map((p) => p.grams)).toEqual([80, 160]);
    expect(chickpea.portions!.map((p) => p.zh)).toEqual(['1/2 杯（熟）', '1 杯（熟）']);
    expect(chickpea.portions!.map((p) => p.en)).toEqual(['1/2 Cup Cooked', '1 Cup Cooked']);
  });

  it('中式份量锚点：馒头按个、白粥按碗、水饺按个', () => {
    const bun = SEED_FOODS.find((s) => s.zh === '馒头')!;
    expect(bun.portions!.map((p) => p.grams)).toEqual([100, 50]);
    expect(bun.portions!.map((p) => p.zh)).toEqual(['1 个（中等）', '半个']);
    expect(bun.portions!.map((p) => p.en)).toEqual(['1 Medium Bun', '1/2 Bun']);
    const congee = SEED_FOODS.find((s) => s.zh === '白粥（大米）')!;
    expect(congee.portions!.map((p) => p.grams)).toEqual([250, 150]);
    expect(congee.portions![0].zh).toBe('1 碗');
    const dumpling = SEED_FOODS.find((s) => s.zh === '猪肉白菜水饺（熟）')!;
    expect(dumpling.portions!.map((p) => p.grams)).toEqual([20, 200]);
    expect(dumpling.portions!.map((p) => p.en)).toEqual(['1 Dumpling', '10 Dumplings']);
  });

  it('parsePortions 合法 JSON 解析、非法回退 null', () => {
    const ok = JSON.stringify([{ zh: '1 片', en: '1 Slice', grams: 35 }]);
    expect(parsePortions(ok)).toEqual([{ zh: '1 片', en: '1 Slice', grams: 35 }]);
    expect(parsePortions(null)).toBeNull();
    expect(parsePortions('')).toBeNull();
    expect(parsePortions('not-json')).toBeNull();
    expect(parsePortions('[]')).toBeNull();
    expect(parsePortions(JSON.stringify([{ zh: 'x', en: 'y', grams: 0 }]))).toBeNull();
  });

  it('foodPortionLabel 按 locale 选取', () => {
    const p = { zh: '1 片', en: '1 Slice' };
    expect(foodPortionLabel(p, 'zh')).toBe('1 片');
    expect(foodPortionLabel(p, 'en')).toBe('1 Slice');
  });
});

describe('Quick Log 纯逻辑', () => {
  it('defaultMealFor 按时段推断餐次', () => {
    const at = (h: number, m: number) => new Date(2026, 9, 11, h, m);
    expect(defaultMealFor(at(5, 0))).toBe('breakfast');
    expect(defaultMealFor(at(10, 29))).toBe('breakfast');
    expect(defaultMealFor(at(10, 30))).toBe('lunch');
    expect(defaultMealFor(at(14, 29))).toBe('lunch');
    expect(defaultMealFor(at(14, 30))).toBe('dinner');
    expect(defaultMealFor(at(20, 59))).toBe('dinner');
    expect(defaultMealFor(at(21, 0))).toBe('snack');
    expect(defaultMealFor(at(23, 30))).toBe('snack');
  });

  it('scaleNutrition per-100g × grams/100 换算', () => {
    const chicken = {
      kcal_per_100g: 165,
      protein_per_100g: 31,
      carb_per_100g: 0,
      fat_per_100g: 3.6,
    };
    const scaled = scaleNutrition(chicken, 150);
    expect(scaled.kcal).toBeCloseTo(247.5, 2);
    expect(scaled.protein).toBeCloseTo(46.5, 2);
    expect(scaled.carb).toBeCloseTo(0, 2);
    expect(scaled.fat).toBeCloseTo(5.4, 2);
  });

  it('100g 即 per-100g 原值', () => {
    const scaled = scaleNutrition(
      { kcal_per_100g: 389, protein_per_100g: 16.9, carb_per_100g: 66.3, fat_per_100g: 6.9 },
      100
    );
    expect(scaled.kcal).toBeCloseTo(389, 2);
    expect(scaled.protein).toBeCloseTo(16.9, 2);
  });
});

// 升级补齐：mock db（getAllAsync 按表名分流；runAsync 捕获 INSERT，并按真实
// WHERE 语义模拟 portions 回填 UPDATE：name 命中且 portions IS NULL 才写行）
interface MockFoodRow {
  name: string;
  name_en: string | null;
  portions: string | null;
}

function officialRow(zh: string): MockFoodRow {
  const seed = SEED_FOODS.find((s) => s.zh === zh);
  return { name: zh, name_en: seed?.en ?? null, portions: null };
}

function makeMockDb(opts: { rows: MockFoodRow[]; categories?: 'full' | 'none' }) {
  const inserts: unknown[][] = [];
  const updates: unknown[][] = [];
  const rows = opts.rows.map((r) => ({ ...r }));
  const db = {
    getAllAsync: vi.fn(async (sql: string) => {
      if (sql.includes('food_category')) {
        return opts.categories === 'none'
          ? []
          : SEED_CATEGORIES.map((c) => ({ id: c.order, name: c.zh, sort_order: c.order }));
      }
      return rows;
    }),
    runAsync: vi.fn(async (sql: string, params: unknown[]) => {
      if (sql.trimStart().startsWith('INSERT')) {
        inserts.push(params);
      } else {
        updates.push(params);
        // 模拟 UPDATE ... WHERE name = ? AND portions IS NULL
        const [portionJson, name] = params as [string, string];
        for (const r of rows) {
          if (r.name === name && r.portions === null) r.portions = portionJson;
        }
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),
  };
  return { db, inserts, updates, rows };
}

describe('ensureSeedFoods 种子升级补齐', () => {
  afterEach(() => {
    mockedGetDb.mockReset();
  });

  it('PORTION_BACKFILL_V180 冻结快照：16 个名字全部命中现存种子，且不含新种子', () => {
    const byZh = new Map(SEED_FOODS.map((s) => [s.zh, s]));
    expect(PORTION_BACKFILL_V180.size).toBe(16);
    for (const name of PORTION_BACKFILL_V180) {
      const seed = byZh.get(name);
      expect(seed).toBeDefined();
      expect(seed!.portions).not.toBeNull();
    }
    expect(PORTION_BACKFILL_V180.has('白米饭')).toBe(false);
    expect(PORTION_BACKFILL_V180.has('鹰嘴豆')).toBe(false);
    expect(PORTION_BACKFILL_V180.has('馒头')).toBe(false);
  });

  it('旧库缺失新种子时幂等插入白米饭与鹰嘴豆，历史种子 portions 回填仍执行', async () => {
    const oldNames = SEED_FOODS.map((s) => s.zh).filter(
      (n) => n !== '白米饭' && n !== '鹰嘴豆'
    );
    const { db, inserts, updates, rows } = makeMockDb({ rows: oldNames.map(officialRow) });
    mockedGetDb.mockResolvedValue(db as never);

    await ensureSeedFoods();

    expect(inserts).toHaveLength(2);
    const riceInsert = inserts.find((p) => p[0] === '白米饭')!;
    const chickpeaInsert = inserts.find((p) => p[0] === '鹰嘴豆')!;
    expect(riceInsert).toBeDefined();
    expect(chickpeaInsert).toBeDefined();
    // category_id：碳水 order=1，膳食纤维 order=5
    expect(riceInsert[2]).toBe(1);
    expect(chickpeaInsert[2]).toBe(5);
    // gi（参数位 7）与 portions JSON（参数位 10）
    expect(riceInsert[7]).toBe(73);
    expect(JSON.parse(riceInsert[10] as string).map((p: { grams: number }) => p.grams)).toEqual([
      75, 150,
    ]);
    expect(chickpeaInsert[7]).toBeNull();
    expect(
      JSON.parse(chickpeaInsert[10] as string).map((p: { grams: number }) => p.grams)
    ).toEqual([80, 160]);
    // 回填 UPDATE 只针对 16 个历史种子（库中存在）；新种子不产生空转 UPDATE
    expect(updates).toHaveLength(16);
    expect(updates.every((p) => p[1] !== '白米饭' && p[1] !== '鹰嘴豆')).toBe(true);
    // 16 个历史官方行被真实回填
    expect(rows.filter((r) => r.portions !== null)).toHaveLength(16);
  });

  it('用户已自建同名「白米饭/鹰嘴豆」时跳过插入，且 portions 不被注入', async () => {
    // 全部 28 个 canonical 名均在库；其中两个新名字是用户自建行（name_en 为空）
    const rows = SEED_FOODS.map((s) =>
      s.zh === '白米饭' || s.zh === '鹰嘴豆'
        ? { name: s.zh, name_en: null, portions: null }
        : officialRow(s.zh)
    );
    const { db, inserts, updates, rows: mutatedRows } = makeMockDb({ rows });
    mockedGetDb.mockResolvedValue(db as never);

    await ensureSeedFoods();

    // 不插入任何新种子
    expect(inserts).toHaveLength(0);
    // 回填仅限 16 个历史名字，不含两个新名字
    expect(updates.every((p) => p[1] !== '白米饭' && p[1] !== '鹰嘴豆')).toBe(true);
    // 用户自建行原样保留：portions 仍为 NULL（Quick Log 不会被切成份量模式）
    const userRice = mutatedRows.find((r) => r.name === '白米饭')!;
    const userChickpea = mutatedRows.find((r) => r.name === '鹰嘴豆')!;
    expect(userRice.portions).toBeNull();
    expect(userChickpea.portions).toBeNull();
  });

  it('旧库缺失「馒头」时幂等插入家常种子（完整数据含 gi 与份量），历史回填不受影响', async () => {
    const oldNames = SEED_FOODS.map((s) => s.zh).filter((n) => n !== '馒头');
    const { db, inserts, updates } = makeMockDb({ rows: oldNames.map(officialRow) });
    mockedGetDb.mockResolvedValue(db as never);

    await ensureSeedFoods();

    expect(inserts).toHaveLength(1);
    const bunInsert = inserts.find((p) => p[0] === '馒头')!;
    expect(bunInsert).toBeDefined();
    // category_id：碳水 order=1
    expect(bunInsert[2]).toBe(1);
    // gi（参数位 7）与 portions JSON（参数位 10）
    expect(bunInsert[7]).toBe(88);
    expect(JSON.parse(bunInsert[10] as string).map((p: { grams: number }) => p.grams)).toEqual([
      100, 50,
    ]);
    // 回填 UPDATE 仍只针对 16 个历史种子
    expect(updates).toHaveLength(16);
    expect(updates.every((p) => p[1] !== '馒头')).toBe(true);
  });

  it('分类缺失时升级补齐跳过该条且不抛错', async () => {
    const oldNames = SEED_FOODS.map((s) => s.zh).filter(
      (n) => n !== '白米饭' && n !== '鹰嘴豆'
    );
    const { db, inserts } = makeMockDb({ rows: oldNames.map(officialRow), categories: 'none' });
    mockedGetDb.mockResolvedValue(db as never);

    await expect(ensureSeedFoods()).resolves.toBeUndefined();
    // 升级路径：2 条缺失种子均无法定位分类 → 0 插入
    expect(inserts).toHaveLength(0);
  });
});
