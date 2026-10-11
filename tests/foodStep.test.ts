import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import { isLowGI } from '../src/services/foodService';
import { stepsToKcal } from '../src/services/stepService';
import { computeTarget } from '../src/services/targetService';
import { DEFAULT_CONFIG } from '../src/services/configStore';

describe('isLowGI', () => {
  it('GI <= 55 视为低 GI', () => {
    expect(isLowGI(55)).toBe(true);
    expect(isLowGI(50)).toBe(true);
  });

  it('GI > 55 不是低 GI', () => {
    expect(isLowGI(56)).toBe(false);
    expect(isLowGI(73)).toBe(false);
  });

  it('null 不是低 GI', () => {
    expect(isLowGI(null)).toBe(false);
  });
});

describe('stepsToKcal', () => {
  it('0 步 = 0 kcal', () => {
    expect(stepsToKcal(0)).toBe(0);
  });

  it('10000 步 ≈ 400 kcal', () => {
    expect(stepsToKcal(10000)).toBeCloseTo(400, 2);
  });

  it('每步 0.04 kcal', () => {
    expect(stepsToKcal(1)).toBeCloseTo(0.04, 4);
  });
});

describe('targetService 宏量拆分完整性', () => {
  it('三大宏量热量之和等于 daily_calorie', () => {
    const t = computeTarget(DEFAULT_CONFIG);
    const sum = t.carb_g * 4 + t.protein_g * 4 + t.fat_g * 9;
    expect(sum).toBeCloseTo(t.daily_calorie, 2);
  });
});
