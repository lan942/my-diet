// 配置加载/保存/校验

import { getDb } from '../db/database';
import type { AppConfig } from '../types';

export class ConfigError extends Error {}

export const DEFAULT_CONFIG: AppConfig = {
  kcal_per_kg: 30,
  protein_per_kg: 1.5,
  carb_ratio: 0.5,
  protein_ratio: 0.25,
  fat_ratio: 0.25,
};

export function validateConfig(cfg: AppConfig): void {
  if (!isFinite(cfg.kcal_per_kg) || cfg.kcal_per_kg <= 0) {
    throw new ConfigError('kcal_per_kg 必须为正数');
  }
  if (!isFinite(cfg.protein_per_kg) || cfg.protein_per_kg <= 0) {
    throw new ConfigError('protein_per_kg 必须为正数');
  }
  const sum = cfg.carb_ratio + cfg.protein_ratio + cfg.fat_ratio;
  if (Math.abs(sum - 1) > 0.001) {
    throw new ConfigError(`宏量比例总和为 ${(sum * 100).toFixed(2)}%，必须等于 100%`);
  }
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
  return JSON.parse(row.value) as AppConfig;
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  validateConfig(cfg);
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
    ['main', JSON.stringify(cfg)]
  );
}
