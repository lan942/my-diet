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
} from '../src/services/targetService';
import { DEFAULT_CONFIG } from '../src/services/configStore';
import type { AppConfig, WeightRecord } from '../src/types';

const weight: WeightRecord = {
  id: 1,
  weight_kg: 70,
  recorded_at: '2026-10-10 10:00:00',
};

describe('computeBmr', () => {
  it('男性：70kg/170cm/30岁 = 1617.5', () => {
    expect(computeBmr('male', 70, 170, 30)).toBeCloseTo(1617.5, 2);
  });

  it('女性：70kg/170cm/30岁 = 1451.5', () => {
    expect(computeBmr('female', 70, 170, 30)).toBeCloseTo(1451.5, 2);
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
  it('无体重记录返回 null', () => {
    expect(computeTarget(null, DEFAULT_CONFIG)).toBeNull();
  });

  it('默认配置（男/30/170/1.2）：TDEE=1941，拆分 218.4/145.6/53.9', () => {
    const t = computeTarget(weight, DEFAULT_CONFIG);
    expect(t).not.toBeNull();
    expect(t!.daily_calorie).toBeCloseTo(1941, 2);
    expect(t!.carb_g).toBeCloseTo(218.3625, 2);
    expect(t!.protein_g).toBeCloseTo(145.575, 2);
    expect(t!.fat_g).toBeCloseTo(53.9167, 2);
  });

  it('宏量拆分与热量比例一致', () => {
    const t = computeTarget(weight, DEFAULT_CONFIG)!;
    expect((t.carb_g * 4) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.carb_ratio, 4);
    expect((t.protein_g * 4) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.protein_ratio, 4);
    expect((t.fat_g * 9) / t.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.fat_ratio, 4);
  });

  it('活动系数变更影响热量与拆分', () => {
    const cfg: AppConfig = { ...DEFAULT_CONFIG, activity_factor: 1.9 };
    const t = computeTarget(weight, cfg)!;
    // 男 BMR 1617.5 × 1.9 = 3073.25
    expect(t.daily_calorie).toBeCloseTo(3073.25, 2);
    expect(t.protein_g).toBeCloseTo((3073.25 * 0.3) / 4, 2);
  });

  it('性别变更影响热量', () => {
    const female = computeTarget(weight, { ...DEFAULT_CONFIG, gender: 'female' })!;
    // 女 BMR 1451.5 × 1.2 = 1741.8
    expect(female.daily_calorie).toBeCloseTo(1741.8, 2);
  });

  it('体重变化联动 TDEE', () => {
    const w80: WeightRecord = { ...weight, weight_kg: 80 };
    const t = computeTarget(w80, DEFAULT_CONFIG)!;
    // 男 BMR = 800 + 1062.5 - 150 + 5 = 1717.5 × 1.2 = 2061
    expect(t.daily_calorie).toBeCloseTo(2061, 2);
  });
});
