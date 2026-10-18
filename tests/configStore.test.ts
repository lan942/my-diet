import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import {
  DEFAULT_CONFIG,
  validateConfig,
  normalizeConfig,
  loadConfig,
  saveConfig,
  ConfigError,
} from '../src/services/configStore';
import { getDb } from '../src/db/database';
import type { AppConfig } from '../src/types';

const mockedGetDb = vi.mocked(getDb);

describe('configStore.validateConfig', () => {
  it('接受默认配置', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('接受合法自定义档案与比例', () => {
    const cfg: AppConfig = {
      gender: 'female',
      age: 28,
      height_cm: 160,
      weight_kg: 55,
      activity_factor: 1.55,
      carb_ratio: 0.4,
      protein_ratio: 0.3,
      fat_ratio: 0.3,
      onboarded: true,
      unit_system: 'metric',
      theme_preference: 'system',
    };
    expect(() => validateConfig(cfg)).not.toThrow();
  });

  it('拒绝非法性别', () => {
    expect(() =>
      validateConfig({ ...DEFAULT_CONFIG, gender: 'other' as never })
    ).toThrow(ConfigError);
  });

  it('三值性别均可通过校验（男/女/不选）', () => {
    for (const g of ['male', 'female', 'unknown'] as const) {
      expect(() => validateConfig({ ...DEFAULT_CONFIG, gender: g })).not.toThrow();
    }
  });

  it('拒绝年龄越界（0 / 121 / NaN）', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, age: 0 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, age: 121 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, age: NaN })).toThrow(ConfigError);
  });

  it('拒绝非正数身高', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, height_cm: 0 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, height_cm: -170 })).toThrow(ConfigError);
  });

  it('拒绝非正数体重', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, weight_kg: 0 })).toThrow(ConfigError);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, weight_kg: -70 })).toThrow(ConfigError);
  });

  it('拒绝五档之外的活动系数', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, activity_factor: 1.5 })).toThrow(ConfigError);
  });

  it('拒绝比例和 < 1', () => {
    expect(() =>
      validateConfig({ ...DEFAULT_CONFIG, carb_ratio: 0.35, fat_ratio: 0.25 })
    ).toThrow(ConfigError);
  });

  it('拒绝比例和 > 1', () => {
    expect(() =>
      validateConfig({ ...DEFAULT_CONFIG, carb_ratio: 0.55, fat_ratio: 0.35 })
    ).toThrow(ConfigError);
  });
});

describe('configStore.normalizeConfig', () => {
  it('旧配置（含 kcal_per_kg/protein_per_kg）迁移：废弃字段丢弃，比例保留，档案补默认值', () => {
    const legacy = {
      kcal_per_kg: 30,
      protein_per_kg: 1.5,
      carb_ratio: 0.5,
      protein_ratio: 0.25,
      fat_ratio: 0.25,
    } as unknown as Partial<AppConfig>;
    const cfg = normalizeConfig(legacy);
    expect(cfg).not.toHaveProperty('kcal_per_kg');
    expect(cfg).not.toHaveProperty('protein_per_kg');
    expect(cfg.carb_ratio).toBe(0.5);
    expect(cfg.protein_ratio).toBe(0.25);
    expect(cfg.fat_ratio).toBe(0.25);
    expect(cfg.gender).toBe(DEFAULT_CONFIG.gender);
    expect(cfg.age).toBe(DEFAULT_CONFIG.age);
    expect(cfg.height_cm).toBe(DEFAULT_CONFIG.height_cm);
    expect(cfg.weight_kg).toBe(DEFAULT_CONFIG.weight_kg);
    expect(cfg.activity_factor).toBe(DEFAULT_CONFIG.activity_factor);
  });

  it('全空输入返回默认配置', () => {
    expect(normalizeConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  it('onboarded 缺失为 false，true 保留；unit_system 缺失/非法回退 metric', () => {
    const cfg = normalizeConfig({ onboarded: true, unit_system: 'us' });
    expect(cfg.onboarded).toBe(true);
    expect(cfg.unit_system).toBe('us');
    const fallback = normalizeConfig({ unit_system: 'imperial' as never });
    expect(fallback.onboarded).toBe(false);
    expect(fallback.unit_system).toBe('metric');
  });

  it('非法 gender 回退 unknown（unknown 本身合法保留）', () => {
    expect(normalizeConfig({ gender: 'other' as never }).gender).toBe('unknown');
    expect(normalizeConfig({ gender: 'unknown' }).gender).toBe('unknown');
    expect(normalizeConfig({ gender: 'female' }).gender).toBe('female');
  });
});

describe('configStore.loadConfig / saveConfig', () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
  });

  it('无配置行时保存并返回默认配置', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined);
    const firstAsync = vi.fn().mockResolvedValue(null);
    mockedGetDb.mockResolvedValue({
      getFirstAsync: firstAsync as never,
      runAsync: runAsync as never,
    } as never);

    const cfg = await loadConfig();
    expect(cfg).toEqual(DEFAULT_CONFIG);
    expect(runAsync).toHaveBeenCalled();
  });

  it('读取旧版 JSON 时归一化迁移', async () => {
    const legacyJson = JSON.stringify({
      kcal_per_kg: 33,
      protein_per_kg: 1.5,
      carb_ratio: 0.5,
      protein_ratio: 0.25,
      fat_ratio: 0.25,
    });
    const firstAsync = vi.fn().mockResolvedValue({ value: legacyJson });
    mockedGetDb.mockResolvedValue({
      getFirstAsync: firstAsync as never,
      runAsync: vi.fn() as never,
    } as never);

    const cfg = await loadConfig();
    expect(cfg.carb_ratio).toBe(0.5);
    expect(cfg.activity_factor).toBe(DEFAULT_CONFIG.activity_factor);
    expect((cfg as unknown as Record<string, unknown>).kcal_per_kg).toBeUndefined();
  });

  it('JSON 损坏时回退默认配置', async () => {
    const firstAsync = vi.fn().mockResolvedValue({ value: '{broken json' });
    mockedGetDb.mockResolvedValue({
      getFirstAsync: firstAsync as never,
      runAsync: vi.fn() as never,
    } as never);

    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('saveConfig 校验失败时拒绝写入', async () => {
    const runAsync = vi.fn();
    mockedGetDb.mockResolvedValue({
      getFirstAsync: vi.fn() as never,
      runAsync: runAsync as never,
    } as never);

    await expect(
      saveConfig({ ...DEFAULT_CONFIG, activity_factor: 1.5 })
    ).rejects.toThrow(ConfigError);
    expect(runAsync).not.toHaveBeenCalled();
  });
});
