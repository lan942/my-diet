// 每日目标计算：BMR (Mifflin-St Jeor) → TDEE (BMR × 活动系数) → 宏量拆分

import type { AppConfig, Gender, TargetResult } from '../types';
import type { TranslationKey } from '../i18n';

// 每克宏量的热量（kcal/g）
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_FAT = 9;

// 活动量五档：UI 选项与配置校验共用（label/desc 为语言包 key，展示时经 t() 翻译）
export interface ActivityLevel {
  factor: number;
  label: TranslationKey;
  desc: TranslationKey;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { factor: 1.2, label: 'activity.1.label', desc: 'activity.1.desc' },
  { factor: 1.375, label: 'activity.2.label', desc: 'activity.2.desc' },
  { factor: 1.55, label: 'activity.3.label', desc: 'activity.3.desc' },
  { factor: 1.725, label: 'activity.4.label', desc: 'activity.4.desc' },
  { factor: 1.9, label: 'activity.5.label', desc: 'activity.5.desc' },
];

// 核心目标模板：引导第 1 步与「我的」预设共用（蛋白/脂肪/碳水）
export interface GoalPreset {
  label: TranslationKey;
  desc: TranslationKey;
  color: string;
  protein: number;
  fat: number;
  carb: number;
}

export const GOAL_PRESETS: GoalPreset[] = [
  { label: 'goal.fatLoss.label', desc: 'goal.fatLoss.desc', color: '#FF6B4A', protein: 0.3, fat: 0.25, carb: 0.45 },
  { label: 'goal.maintain.label', desc: 'goal.maintain.desc', color: '#10B981', protein: 0.25, fat: 0.25, carb: 0.5 },
  { label: 'goal.muscle.label', desc: 'goal.muscle.desc', color: '#6366F1', protein: 0.25, fat: 0.2, carb: 0.55 },
];

// Mifflin-St Jeor 公式：男末项 +5，女 −161，未选性别（unknown）−78（两者中点）
export function computeBmr(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78;
}

export function computeTdee(bmr: number, activityFactor: number): number {
  return bmr * activityFactor;
}

export function computeTarget(cfg: AppConfig): TargetResult {
  const bmr = computeBmr(cfg.gender, cfg.weight_kg, cfg.height_cm, cfg.age);
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
