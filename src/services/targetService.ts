// 每日目标计算：BMR (Mifflin-St Jeor) → TDEE (BMR × 活动系数) → 宏量拆分

import type { AppConfig, Gender, TargetResult, WeightRecord } from '../types';

// 每克宏量的热量（kcal/g）
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_FAT = 9;

// 活动量五档：UI 选项与配置校验共用
export interface ActivityLevel {
  factor: number;
  label: string;
  desc: string;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { factor: 1.2, label: '久坐不动', desc: '几乎不运动/办公族' },
  { factor: 1.375, label: '轻度活动', desc: '每周轻度运动 1-3 天' },
  { factor: 1.55, label: '中度活动', desc: '每周中等强度运动 3-5 天' },
  { factor: 1.725, label: '高强度活动', desc: '每周高强度运动 6-7 天' },
  { factor: 1.9, label: '极高强度', desc: '职业运动员/重体力劳动者' },
];

// Mifflin-St Jeor 公式
export function computeBmr(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function computeTdee(bmr: number, activityFactor: number): number {
  return bmr * activityFactor;
}

export function computeTarget(
  latestWeight: WeightRecord | null,
  cfg: AppConfig
): TargetResult | null {
  if (!latestWeight) {
    return null;
  }
  const bmr = computeBmr(cfg.gender, latestWeight.weight_kg, cfg.height_cm, cfg.age);
  const daily_calorie = computeTdee(bmr, cfg.activity_factor);

  const carb_g = (daily_calorie * cfg.carb_ratio) / KCAL_PER_G_CARB;
  const protein_g = (daily_calorie * cfg.protein_ratio) / KCAL_PER_G_PROTEIN;
  const fat_g = (daily_calorie * cfg.fat_ratio) / KCAL_PER_G_FAT;

  return {
    daily_calorie,
    carb_g,
    protein_g,
    fat_g,
  };
}
