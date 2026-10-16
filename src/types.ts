// 领域类型定义

export interface FoodCategory {
  id: number;
  name: string;
  sort_order: number;
}

// 生活化份量预设（Household Portions）：双语标签 + 克数锚点
export interface FoodPortion {
  zh: string;
  en: string;
  grams: number;
}

export interface FoodItem {
  id: number;
  name: string; // 中文名（canonical），en 显示走 name_en
  name_en: string | null; // 英文名；自定义食物为 null（回退 name）
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi: number | null;
  notes: string; // 中文备注（canonical）
  notes_en: string | null; // 英文备注；自定义食物为 null
  portions: FoodPortion[] | null; // 生活化份量预设；自定义食物为 null
  updated_at: string | null;
}

export interface IntakeLog {
  id: number;
  date: string; // YYYY-MM-DD
  food_item_id: number;
  grams: number;
  meal: string; // 早/午/晚/加餐
  created_at: string | null;
}

export type StepSource = 'manual' | 'platform';

export interface StepLog {
  id: number;
  date: string; // YYYY-MM-DD
  steps: number;
  source: StepSource; // manual=手动录入，platform=健康平台同步（Health Connect/HealthKit）
  created_at: string | null;
}

export type Gender = 'male' | 'female' | 'unknown';

export type UnitSystem = 'metric' | 'us';

export interface AppConfig {
  // 用户基础档案（用于 BMR/TDEE 计算）
  gender: Gender;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_factor: number;
  // 三大宏量配比（和为 1）
  carb_ratio: number;
  protein_ratio: number;
  fat_ratio: number;
  // 引导与偏好
  onboarded: boolean;
  unit_system: UnitSystem;
}

export interface TargetResult {
  daily_calorie: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}

export interface DailyNutrition {
  total_kcal: number;
  total_protein: number;
  total_carb: number;
  total_fat: number;
}

// 能量平衡（纯派生，不持久化）：步数消耗 → 调整后热量目标 / 净热量 / 剩余预算
export interface EnergyBalance {
  stepsKcal: number;
  adjustedCalorie: number;
  netKcal: number;
  remaining: number;
}

// JSON 全量备份（version 当前为 1）
export interface BackupData {
  version: number;
  exportedAt: string;
  config: AppConfig;
  intake_logs: IntakeLog[];
  step_logs: StepLog[];
  food_categories: FoodCategory[];
  food_items: FoodItem[];
}
