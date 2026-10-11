import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import {
  computeBmr,
  computeTdee,
  computeTarget,
  ACTIVITY_LEVELS,
  GOAL_PRESETS,
} from '../src/services/targetService';
import { DEFAULT_CONFIG } from '../src/services/configStore';
import type { AppConfig } from '../src/types';

describe('computeBmr', () => {
  it('男性：70kg/170cm/30岁 = 1617.5', () => {
    expect(computeBmr('male', 70, 170, 30)).toBeCloseTo(1617.5, 2);
  });

  it('女性：70kg/170cm/30岁 = 1451.5', () => {
    expect(computeBmr('female', 70, 170, 30)).toBeCloseTo(1451.5, 2);
  });

  it('未选性别（unknown）：70kg/170cm/30岁 = 1534.5', () => {
    expect(computeBmr('unknown', 70, 170, 30)).toBeCloseTo(1534.5, 2);
  });
});

describe('GOAL_PRESETS', () => {
  it('提供 3 个核心目标模板且配比和为 1', () => {
    expect(GOAL_PRESETS.map((p) => p.label)).toEqual([
      'goal.fatLoss.label',
      'goal.maintain.label',
      'goal.muscle.label',
    ]);
    for (const p of GOAL_PRESETS) {
      expect(p.protein + p.fat + p.carb).toBeCloseTo(1, 6);
    }
  });

  it('模板配比：减脂 30/25/45、维持体重 25/25/50、增肌 25/20/55（蛋白/脂肪/碳水）', () => {
    const [cut, maintain, bulk] = GOAL_PRESETS;
    expect([cut.protein, cut.fat, cut.carb]).toEqual([0.3, 0.25, 0.45]);
    expect([maintain.protein, maintain.fat, maintain.carb]).toEqual([0.25, 0.25, 0.5]);
    expect([bulk.protein, bulk.fat, bulk.carb]).toEqual([0.25, 0.2, 0.55]);
  });
});

describe('computeTdee', () => {
  it('BMR × 活动系数：1617.5 × 1.2 = 1941', () => {
    expect(computeTdee(1617.5, 1.2)).toBeCloseTo(1941, 2);
  });

  it('活动量表为五档合法系数', () => {
    expect(ACTIVITY_LEVELS.map((l) => l.factor)).toEqual([
      1.2, 1.375, 1.55, 1.725, 1.9,
    ]);
  });
});

describe('computeTarget', () => {
  it('默认比例 + 男性档案（30/170/70kg/1.2）：TDEE=1941，拆分 218.4/145.6/53.9', () => {
    const t = computeTarget({ ...DEFAULT_CONFIG, gender: 'male' });
    expect(t.daily_calorie).toBeCloseTo(1941, 2);
    expect(t.carb_g).toBeCloseTo(218.3625, 2);
    expect(t.protein_g).toBeCloseTo(145.575, 2);
    expect(t.fat_g).toBeCloseTo(53.9167, 2);
  });

  it('宏量拆分与热量比例一致', () => {
    const t = computeTarget(DEFAULT_CONFIG);
    expect((t.carb_g * 4) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.carb_ratio, 4);
    expect((t.protein_g * 4) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.protein_ratio, 4);
    expect((t.fat_g * 9) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.fat_ratio, 4);
  });

  it('活动系数变更影响热量与拆分', () => {
    const cfg: AppConfig = { ...DEFAULT_CONFIG, gender: 'male', activity_factor: 1.9 };
    const t = computeTarget(cfg);
    // 男 BMR 1617.5 × 1.9 = 3073.25
    expect(t.daily_calorie).toBeCloseTo(3073.25, 2);
    expect(t.protein_g).toBeCloseTo((3073.25 * 0.3) / 4, 2);
  });

  it('性别变更影响热量', () => {
    const female = computeTarget({ ...DEFAULT_CONFIG, gender: 'female' });
    // 女 BMR 1451.5 × 1.2 = 1741.8
    expect(female.daily_calorie).toBeCloseTo(1741.8, 2);
  });

  it('档案体重变更联动 TDEE', () => {
    const t = computeTarget({ ...DEFAULT_CONFIG, gender: 'male', weight_kg: 80 });
    // 男 BMR = 800 + 1062.5 - 150 + 5 = 1717.5 × 1.2 = 2061
    expect(t.daily_calorie).toBeCloseTo(2061, 2);
  });
});
