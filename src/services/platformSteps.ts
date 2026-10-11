// 平台步数源统一接口：Android → Health Connect，iOS → HealthKit
// 本文件保持零 react-native 依赖（vitest node 环境可导入）；
// 平台实现在 platformSteps.android.ts / platformSteps.ios.ts，Metro 按平台解析，
// 其他环境（含测试）落到本文件的降级实现。

export type PlatformStepsAvailability = 'available' | 'update_required' | 'unavailable';

export interface PlatformSteps {
  // 健康平台是否可用（不触发任何权限弹窗）
  availability: () => Promise<PlatformStepsAvailability>;
  // 请求读取权限：仅在用户主动触发同步时调用；返回是否获得授权
  requestPermissions: () => Promise<boolean>;
  // 读取当日步数聚合值；未授权/不可用返回 null
  readTodaySteps: () => Promise<number | null>;
}

// 当地当日 00:00 ~ 23:59:59.999 的时间范围（平台 API 需要 ISO 字符串）
export function todayDayRange(now?: Date): { startTime: string; endTime: string } {
  const d = now ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    startTime: `${day}T00:00:00.000`,
    endTime: `${day}T23:59:59.999`,
  };
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
  readTodaySteps: async () => null,
};

export const platformSteps: PlatformSteps = unavailablePlatformSteps;

export default platformSteps;
