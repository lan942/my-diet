// 食物库重构测试：种子数据集完整性、foodTags 派生、filterFoods 搜索、Quick Log 纯逻辑

import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-11 12:00:00',
  todayString: () => '2026-10-11',
}));

import {
  SEED_FOODS,
  SEED_CATEGORIES,
  foodTags,
  filterFoods,
  foodDisplayName,
  foodDisplayNotes,
  foodPortionLabel,
  parsePortions,
  canonicalCatKind,
} from '../src/services/foodService';
import { defaultMealFor, scaleNutrition } from '../src/services/intakeService';
import type { FoodItem } from '../src/types';

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
  it('约 25 条食物（24-27 之间）', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(24);
    expect(SEED_FOODS.length).toBeLessThanOrEqual(27);
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
