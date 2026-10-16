import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import { isLowGI, validateGi, parsePortions } from '../src/services/foodService';
import { stepsToKcal } from '../src/services/energyBalance';
import { computeTarget } from '../src/services/targetService';
import { DEFAULT_CONFIG } from '../src/services/configStore';
import { BizError, ERR } from '../src/services/errors';

describe('isLowGI', () => {
  it('GI <= 55 视为低 GI', () => {
    expect(isLowGI(55)).toBe(true);
    expect(isLowGI(50)).toBe(true);
  });

  it('GI > 55 不是低 GI', () => {
    expect(isLowGI(56)).toBe(false);
    expect(isLowGI(73)).toBe(false);
  });

  it('null 不是低 GI', () => {
    expect(isLowGI(null)).toBe(false);
  });
});

describe('validateGi 取值域 0–100 整数', () => {
  it('null/undefined 放行（不标注 GI）', () => {
    expect(() => validateGi(null)).not.toThrow();
    expect(() => validateGi(undefined)).not.toThrow();
  });

  it('0 与 100 边界放行', () => {
    expect(() => validateGi(0)).not.toThrow();
    expect(() => validateGi(100)).not.toThrow();
  });

  it.each([-1, 101, 55.5, NaN, Infinity])('%s 抛 ERR_INVALID_GI', (gi) => {
    try {
      validateGi(gi);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(BizError);
      expect((e as BizError).code).toBe(ERR.INVALID_GI);
    }
  });
});

describe('isLowGI 下界防御', () => {
  it('负 GI（脏数据）不判为低 GI', () => {
    expect(isLowGI(-5)).toBe(false);
    expect(isLowGI(0)).toBe(true);
    expect(isLowGI(55)).toBe(true);
  });
});

describe('parsePortions 脏数据防御', () => {
  it('合法份量数组解析成功', () => {
    const parsed = parsePortions('[{"zh":"掌心","en":"Palm","grams":100}]');
    expect(parsed).toEqual([{ zh: '掌心', en: 'Palm', grams: 100 }]);
  });

  it.each([
    'null',
    '[]',
    'not-json',
    '[{"zh":"a","en":"b","grams":-5}]',
    '[{"zh":"a","en":"b","grams":0}]',
    '[{"grams":100}]',
    '[{"zh":"a","en":"","grams":100}]',
  ])('%s → null', (json) => {
    expect(parsePortions(json)).toBeNull();
  });
});

describe('stepsToKcal（按体重估算，详细用例见 energyBalance.test.ts）', () => {
  it('0 步 = 0 kcal', () => {
    expect(stepsToKcal(0, 70)).toBe(0);
  });

  it('70kg 10000 步 = 350 kcal', () => {
    expect(stepsToKcal(10000, 70)).toBe(350);
  });
});

describe('targetService 宏量拆分完整性', () => {
  it('三大宏量热量之和等于 daily_calorie', () => {
    const t = computeTarget(DEFAULT_CONFIG);
    const sum = t.carb_g * 4 + t.protein_g * 4 + t.fat_g * 9;
    expect(sum).toBeCloseTo(t.daily_calorie, 2);
  });
});
