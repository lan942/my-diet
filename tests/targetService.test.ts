import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import { computeTarget } from '../src/services/targetService';
import { DEFAULT_CONFIG } from '../src/services/configStore';
import type { WeightRecord } from '../src/types';

describe('computeTarget', () => {
  const weight: WeightRecord = {
    id: 1,
    weight_kg: 70,
    recorded_at: '2026-10-10 10:00:00',
  };

  it('无体重记录返回 null', () => {
    expect(computeTarget(null, DEFAULT_CONFIG)).toBeNull();
  });

  it('70kg 默认配置：热量=2100, 蛋白=105', () => {
    const t = computeTarget(weight, DEFAULT_CONFIG);
    expect(t).not.toBeNull();
    expect(t!.daily_calorie).toBeCloseTo(2100, 2);
    expect(t!.daily_protein).toBeCloseTo(105, 2);
  });

  it('宏量拆分与热量比例一致', () => {
    const t = computeTarget(weight, DEFAULT_CONFIG);
    expect(t).not.toBeNull();
    const carbKcal = t!.carb_g * 4;
    expect(carbKcal / t!.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.carb_ratio, 4);
    const proteinKcal = t!.protein_g * 4;
    expect(proteinKcal / t!.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.protein_ratio, 4);
    const fatKcal = t!.fat_g * 9;
    expect(fatKcal / t!.daily_calorie).toBeCloseTo(DEFAULT_CONFIG.fat_ratio, 4);
  });

  it('调整 kcal_per_kg 影响热量不影响蛋白质', () => {
    const highKcal = computeTarget(weight, {
      ...DEFAULT_CONFIG,
      kcal_per_kg: 33,
    });
    expect(highKcal!.daily_calorie).toBeCloseTo(70 * 33, 2);
    expect(highKcal!.daily_protein).toBeCloseTo(105, 2);
  });

  it('调整 protein_per_kg 影响蛋白质不影响热量', () => {
    const highProtein = computeTarget(weight, {
      ...DEFAULT_CONFIG,
      protein_per_kg: 2.0,
    });
    expect(highProtein!.daily_protein).toBeCloseTo(70 * 2, 2);
    expect(highProtein!.daily_calorie).toBeCloseTo(2100, 2);
  });
});
