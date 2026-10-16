// 平台步数源统一接口：Android → Health Connect，iOS → HealthKit
// 本文件保持零 react-native 依赖（vitest node 环境可导入）；
// 平台实现在 platformSteps.android.ts / platformSteps.ios.ts，Metro 按平台解析，
// 其他环境（含测试）落到本文件的降级实现。

export type PlatformStepsAvailability = 'available' | 'update_required' | 'unavailable';

export interface PlatformSteps {
  // 健康平台是否可用（不触发任何权限弹窗）
  availability: () => Promise<PlatformStepsAvailability>;
  // 请求读取权限：仅在用户主动触发连接时调用；返回是否获得授权
  requestPermissions: () => Promise<boolean>;
  // 读取指定日期（YYYY-MM-DD，本地日界）步数聚合值；未授权/不可用返回 null
  readStepsForDate: (date: string) => Promise<number | null>;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad3 = (n: number) => String(n).padStart(3, '0');

// 将 Date 格式化为带本地时区偏移的 ISO-8601 串（如 2026-10-15T00:00:00.000+08:00）。
// Health Connect 原生层以 java.time.Instant.parse 解析，缺省偏移会抛 DateTimeParseException。
export function toOffsetISO(d: Date): string {
  const datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(
    d.getMilliseconds()
  )}`;
  // getTimezoneOffset() 对 UTC 以东返回负值，故取反得到常规语义的偏移符号
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offset = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  return `${datePart}T${timePart}${offset}`;
}

// 解析 YYYY-MM-DD 为本地自然日的 Date 零点；非法日期返回 null
export function parseLocalDate(date: string, now: Date = new Date()): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  // 拒绝 2026-02-31 这类被 Date 归一化的溢出日期
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  // 仅用到 now 的时区环境（getTimezoneOffset），不约束历史/未来日期
  void now;
  return d;
}

// 任意日期当地 00:00.000 ~ 23:59:59.999 的时间范围（携带本地偏移，平台 API 可直接解析）。
// date 非法时抛错：调用方传入的均为系统生成的 YYYY-MM-DD，非法属于编程错误而非平台降级。
export function dayRangeForDate(
  date: string,
  now?: Date
): { startTime: string; endTime: string } {
  const start = parseLocalDate(date, now);
  if (!start) {
    throw new Error(`invalid date for step day range: ${date}`);
  }
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return {
    startTime: toOffsetISO(start),
    endTime: toOffsetISO(end),
  };
}

// 当日时间范围（dayRangeForDate 的薄封装）
export function todayDayRange(now?: Date): { startTime: string; endTime: string } {
  const d = now ?? new Date();
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return dayRangeForDate(date, d);
}

// 平台聚合结果 → 步数（缺省/非法值归零）
export function parseStepsAggregate(result: { COUNT_TOTAL?: number } | null | undefined): number {
  const total = result?.COUNT_TOTAL;
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
    return 0;
  }
  return Math.round(total);
}

// 降级实现：平台不可用/未实现时全部走不出去
export const unavailablePlatformSteps: PlatformSteps = {
  availability: async () => 'unavailable',
  requestPermissions: async () => false,
  readStepsForDate: async () => null,
};

export const platformSteps: PlatformSteps = unavailablePlatformSteps;

export default platformSteps;
