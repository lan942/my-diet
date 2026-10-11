import { describe, it, expect } from 'vitest';

import {
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  cmToInSnap,
  inToCm,
  ftInLabel,
} from '../src/services/unit';

describe('unit 换算', () => {
  it('cmToFtIn：170cm ≈ 5英尺 6.9英寸；12 英寸进位到英尺', () => {
    const a = cmToFtIn(170);
    expect(a.ft).toBe(5);
    expect(a.in).toBeCloseTo(6.9, 1);
    expect(cmToFtIn(152.4)).toEqual({ ft: 5, in: 0 });
  });

  it('ftInToCm：5ft 7in = 170.2cm（1 位小数）', () => {
    expect(ftInToCm(5, 7)).toBeCloseTo(170.2, 1);
  });

  it('kg ⇄ lb：70kg = 154.3lb，往返误差 ≤ 0.1', () => {
    expect(kgToLb(70)).toBeCloseTo(154.3, 1);
    expect(lbToKg(154.3)).toBeCloseTo(70.0, 1);
  });

  it('cm ⇄ ft/in 往返误差 ≤ 0.15cm（英寸 0.05 步进舍入）', () => {
    const { ft, in: inch } = cmToFtIn(183);
    expect(Math.abs(ftInToCm(ft, inch) - 183)).toBeLessThan(0.15);
  });

  it('cmToInSnap：170cm 吸附到 67 英寸（0.5 格）；inToCm 往返误差 < 0.2cm', () => {
    expect(cmToInSnap(170)).toBe(67);
    expect(cmToInSnap(170.2)).toBe(67);
    expect(cmToInSnap(171.5)).toBe(67.5);
    const cm = inToCm(cmToInSnap(170));
    expect(Math.abs(cm - 170)).toBeLessThan(0.2);
  });

  it('ftInLabel：67 英寸读数为 5′7″', () => {
    expect(ftInLabel(67)).toBe('5′7″');
  });
});
