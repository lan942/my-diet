// 领域类型定义

export interface FoodCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface FoodItem {
  id: number;
  name: string;
  category_id: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  gi: number | null;
  notes: string;
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

export interface StepLog {
  id: number;
  date: string; // YYYY-MM-DD
  steps: number;
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
