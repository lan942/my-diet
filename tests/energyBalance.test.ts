import { describe, it, expect } from 'vitest';

import { stepsToKcal, computeEnergyBalance } from '../src/services/energyBalance';

describe('stepsToKcal 按体重估算', () => {
  it('70kg × 10000 步 = 350 kcal', () => {
    expect(stepsToKcal(10000, 70)).toBe(350);
  });

  it('80kg × 10000 步 = 400 kcal（体重变化即时重算）', () => {
    expect(stepsToKcal(10000, 80)).toBe(400);
  });

  it('0 / null / 负步数均为 0', () => {
    expect(stepsToKcal(0, 70)).toBe(0);
    expect(stepsToKcal(null, 70)).toBe(0);
    expect(stepsToKcal(-10, 70)).toBe(0);
  });

  it('结果四舍五入为整数 kcal', () => {
    // 6543 步 × 0.0005 × 70 = 229.005
    expect(stepsToKcal(6543, 70)).toBe(229);
  });

  it('体重非法时归零（防御）', () => {
    expect(stepsToKcal(10000, 0)).toBe(0);
    expect(stepsToKcal(10000, NaN)).toBe(0);
  });
});

describe('computeEnergyBalance 能量平衡', () => {
  it('TDEE2000 + 1万步@70kg + 摄入1800 → 2350/550/1450', () => {
    const b = computeEnergyBalance({
      targetKcal: 2000,
      intakeKcal: 1800,
      steps: 10000,
      weightKg: 70,
    });
    expect(b.stepsKcal).toBe(350);
    expect(b.adjustedCalorie).toBe(2350);
    expect(b.remaining).toBe(550);
    expect(b.netKcal).toBe(1450);
  });

  it('无步数：调整后目标=TDEE，净热量=摄入', () => {
    const b = computeEnergyBalance({
      targetKcal: 2000,
      intakeKcal: 1800,
      steps: null,
      weightKg: 70,
    });
    expect(b.stepsKcal).toBe(0);
    expect(b.adjustedCalorie).toBe(2000);
    expect(b.remaining).toBe(200);
    expect(b.netKcal).toBe(1800);
  });

  it('历史日期场景：TDEE2000 + 6000步@70kg（210）+ 摄入2200 → 净1990 / 超10', () => {
    const b = computeEnergyBalance({
      targetKcal: 2000,
      intakeKcal: 2200,
      steps: 6000,
      weightKg: 70,
    });
    expect(b.stepsKcal).toBe(210);
    expect(b.adjustedCalorie).toBe(2210);
    expect(b.netKcal).toBe(1990);
    expect(b.remaining).toBe(10);
  });

  it('宏量目标不受步数影响（本函数只动热量口径，不产出宏量值）', () => {
    const without = computeEnergyBalance({
      targetKcal: 2000,
      intakeKcal: 1800,
      steps: 0,
      weightKg: 70,
    });
    const withSteps = computeEnergyBalance({
      targetKcal: 2000,
      intakeKcal: 1800,
      steps: 12000,
      weightKg: 70,
    });
    // 仅热量口径变化，调用方据此只调整热量 ProgressBar
    expect(withSteps.adjustedCalorie).toBeGreaterThan(without.adjustedCalorie);
    expect(withSteps).not.toHaveProperty('protein_g');
  });
});
