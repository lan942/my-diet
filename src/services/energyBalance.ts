// 能量平衡纯逻辑（零 RN 依赖，vitest 可直接导入）：
// 步数按体重估算活动消耗，并将其并入当日热量目标形成能量平衡视图。
// 所有结果均为展示层派生值，不持久化。

import type { EnergyBalance } from '../types';

// 步行活动消耗估算：0.0005 kcal / 步 / kg
// （70kg 人 1 万步 ≈ 350 kcal，与常用步行估算一致）
export function stepsToKcal(steps: number | null, weightKg: number): number {
  if (!steps || !isFinite(steps) || steps <= 0) return 0;
  const w = isFinite(weightKg) && weightKg > 0 ? weightKg : 0;
  return Math.round(steps * 0.0005 * w);
}

export interface EnergyBalanceInput {
  targetKcal: number; // 当日 TDEE 目标
  intakeKcal: number; // 当日摄入总热量
  steps: number | null; // 当日步数（无记录为 null）
  weightKg: number; // 当前体重（kg）
}

export function computeEnergyBalance(args: EnergyBalanceInput): EnergyBalance {
  const stepsKcal = stepsToKcal(args.steps, args.weightKg);
  const adjustedCalorie = args.targetKcal + stepsKcal;
  const netKcal = args.intakeKcal - stepsKcal;
  const remaining = adjustedCalorie - args.intakeKcal;
  return { stepsKcal, adjustedCalorie, netKcal, remaining };
}
