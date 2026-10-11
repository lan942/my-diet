// 公制/美制单位换算（纯函数）：持久化始终为 cm/kg，单位只影响输入与展示

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export interface FtIn {
  ft: number;
  in: number;
}

/** 厘米 → 英尺 + 英寸（英寸保留 1 位小数，进位避免 12.0 出现在 in 上） */
export function cmToFtIn(cm: number): FtIn {
  const totalIn = cm / CM_PER_INCH;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * 10) / 10;
  if (inch >= 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, in: inch };
}

export function ftInToCm(ft: number, inch: number): number {
  const totalIn = ft * 12 + inch;
  return Math.round(totalIn * CM_PER_INCH * 10) / 10;
}

/** 公斤 → 磅（1 位小数） */
export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

/** 磅 → 公斤（1 位小数） */
export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 10) / 10;
}

/** 厘米 → 英寸（吸附到 0.5 英寸刻度，供刻度尺显示） */
export function cmToInSnap(cm: number): number {
  return Math.round((cm / CM_PER_INCH) * 2) / 2;
}

/** 英寸 → 厘米（1 位小数） */
export function inToCm(inch: number): number {
  return Math.round(inch * CM_PER_INCH * 10) / 10;
}

/** 英寸数 → 「X 英尺 Y 英寸」读数（用于美制身高展示） */
export function ftInLabel(totalInches: number): string {
  const { ft, in: inch } = cmToFtIn(totalInches * CM_PER_INCH);
  return `${ft}′${inch}″`;
}
