// 配置加载/保存/校验（含旧配置归一化迁移）

import { getDb } from '../db/database';
import type { AppConfig, Gender } from '../types';
import { ACTIVITY_LEVELS } from './targetService';

export class ConfigError extends Error {}

export const DEFAULT_CONFIG: AppConfig = {
  gender: 'unknown',
  age: 30,
  height_cm: 170,
  weight_kg: 70,
  activity_factor: 1.2,
  carb_ratio: 0.45,
  protein_ratio: 0.3,
  fat_ratio: 0.25,
  onboarded: false,
  unit_system: 'metric',
};

const ACTIVITY_FACTORS = ACTIVITY_LEVELS.map((l) => l.factor);

export function validateConfig(cfg: AppConfig): void {
  if (cfg.gender !== 'male' && cfg.gender !== 'female' && cfg.gender !== 'unknown') {
    throw new ConfigError('性别必须为男、女或不选');
  }
  if (!Number.isFinite(cfg.age) || cfg.age < 1 || cfg.age > 120) {
    throw new ConfigError('年龄必须在 1~120 之间');
  }
  if (!Number.isFinite(cfg.height_cm) || cfg.height_cm <= 0) {
    throw new ConfigError('身高必须为正数');
  }
  if (!Number.isFinite(cfg.weight_kg) || cfg.weight_kg <= 0) {
    throw new ConfigError('体重必须为正数');
  }
  if (!ACTIVITY_FACTORS.includes(cfg.activity_factor)) {
    throw new ConfigError('活动量系数不合法');
  }
  const sum = cfg.carb_ratio + cfg.protein_ratio + cfg.fat_ratio;
  if (Math.abs(sum - 1) > 0.001) {
    throw new ConfigError(`宏量比例总和为 ${(sum * 100).toFixed(2)}%，必须等于 100%`);
  }
}

// 旧配置归一化：缺失字段补默认值，废弃字段（kcal_per_kg/protein_per_kg）丢弃，比例字段保留；
// onboarded 缺失视为未完成引导，unit_system 缺失/非法回退公制
export function normalizeConfig(raw: Partial<AppConfig> | null): AppConfig {
  const merged: AppConfig = {
    gender: (raw?.gender === 'female' || raw?.gender === 'male' || raw?.gender === 'unknown'
      ? raw.gender
      : DEFAULT_CONFIG.gender) as Gender,
    age: Number.isFinite(Number(raw?.age)) ? Number(raw?.age) : DEFAULT_CONFIG.age,
    height_cm: Number.isFinite(Number(raw?.height_cm))
      ? Number(raw?.height_cm)
      : DEFAULT_CONFIG.height_cm,
    weight_kg: Number.isFinite(Number(raw?.weight_kg))
      ? Number(raw?.weight_kg)
      : DEFAULT_CONFIG.weight_kg,
    activity_factor: Number.isFinite(Number(raw?.activity_factor))
      ? Number(raw?.activity_factor)
      : DEFAULT_CONFIG.activity_factor,
    carb_ratio: Number.isFinite(Number(raw?.carb_ratio))
      ? Number(raw?.carb_ratio)
      : DEFAULT_CONFIG.carb_ratio,
    protein_ratio: Number.isFinite(Number(raw?.protein_ratio))
      ? Number(raw?.protein_ratio)
      : DEFAULT_CONFIG.protein_ratio,
    fat_ratio: Number.isFinite(Number(raw?.fat_ratio))
      ? Number(raw?.fat_ratio)
      : DEFAULT_CONFIG.fat_ratio,
    onboarded: raw?.onboarded === true,
    unit_system: raw?.unit_system === 'us' ? 'us' : DEFAULT_CONFIG.unit_system,
  };
  return merged;
}

export async function loadConfig(): Promise<AppConfig> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_config WHERE key = ?',
    ['main']
  );
  if (!row) {
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  // JSON 解析失败或字段缺失时回退默认配置，保证应用可启动
  let raw: Partial<AppConfig> | null = null;
  try {
    raw = JSON.parse(row.value) as Partial<AppConfig>;
  } catch {
    raw = null;
  }
  return normalizeConfig(raw);
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  validateConfig(cfg);
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
    ['main', JSON.stringify(cfg)]
  );
}
