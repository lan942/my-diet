// 每日目标计算

import type { AppConfig, TargetResult, WeightRecord } from '../types';

// 每克宏量的热量（kcal/g）
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_FAT = 9;

export function computeTarget(
  latestWeight: WeightRecord | null,
  cfg: AppConfig
): TargetResult | null {
  if (!latestWeight) {
    return null;
  }
  const daily_calorie = latestWeight.weight_kg * cfg.kcal_per_kg;
  const daily_protein = latestWeight.weight_kg * cfg.protein_per_kg;

  const carb_g = (daily_calorie * cfg.carb_ratio) / KCAL_PER_G_CARB;
  const protein_g = (daily_calorie * cfg.protein_ratio) / KCAL_PER_G_PROTEIN;
  const fat_g = (daily_calorie * cfg.fat_ratio) / KCAL_PER_G_FAT;

  return {
    daily_calorie,
    daily_protein,
    carb_g,
    protein_g,
    fat_g,
  };
}
