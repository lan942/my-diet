import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import { DEFAULT_CONFIG, validateConfig, ConfigError } from '../src/services/configStore';

describe('configStore.validateConfig', () => {
  it('接受默认配置（比例和=1）', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('接受和为 1 的比例', () => {
    expect(() =>
      validateConfig({
        kcal_per_kg: 30,
        protein_per_kg: 1.5,
        carb_ratio: 0.4,
        protein_ratio: 0.3,
        fat_ratio: 0.3,
      })
    ).not.toThrow();
  });

  it('拒绝比例和 < 1', () => {
    expect(() =>
      validateConfig({
        kcal_per_kg: 30,
        protein_per_kg: 1.5,
        carb_ratio: 0.3,
        protein_ratio: 0.3,
        fat_ratio: 0.2,
      })
    ).toThrow(ConfigError);
  });

  it('拒绝比例和 > 1', () => {
    expect(() =>
      validateConfig({
        kcal_per_kg: 30,
        protein_per_kg: 1.5,
        carb_ratio: 0.5,
        protein_ratio: 0.3,
        fat_ratio: 0.3,
      })
    ).toThrow(ConfigError);
  });

  it('拒绝非正系数', () => {
    expect(() =>
      validateConfig({
        kcal_per_kg: 0,
        protein_per_kg: 1.5,
        carb_ratio: 0.5,
        protein_ratio: 0.25,
        fat_ratio: 0.25,
      })
    ).toThrow(ConfigError);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('比例总和为 1', () => {
    const sum =
      DEFAULT_CONFIG.carb_ratio +
      DEFAULT_CONFIG.protein_ratio +
      DEFAULT_CONFIG.fat_ratio;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('系数为正数', () => {
    expect(DEFAULT_CONFIG.kcal_per_kg).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.protein_per_kg).toBeGreaterThan(0);
  });
});
