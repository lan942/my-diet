// iOS 实现：HealthKit（Expo Modules 自封装模块 NutriPulseHealth）
// 模块缺失（未编译进原生工程）时自动降级为不可用

import { requireOptionalNativeModule } from 'expo-modules-core';
import type {
  PlatformSteps,
  PlatformStepsAvailability,
} from './platformSteps';

interface NutriPulseHealthModule {
  availability: () => string;
  requestPermissions: () => Promise<boolean>;
  readTodaySteps: () => Promise<number | null>;
}

// requireOptionalNativeModule 在模块未注册时返回 null（而不是抛错）
const native = requireOptionalNativeModule('NutriPulseHealth') as
  | NutriPulseHealthModule
  | null;

function mapAvailability(value: string | undefined): PlatformStepsAvailability {
  return value === 'available' ? 'available' : 'unavailable';
}

export const platformSteps: PlatformSteps = native
  ? {
      availability: async () => {
        try {
          return mapAvailability(native.availability());
        } catch {
          return 'unavailable';
        }
      },
      requestPermissions: async () => {
        try {
          return await native.requestPermissions();
        } catch {
          return false;
        }
      },
      readTodaySteps: async () => {
        try {
          return await native.readTodaySteps();
        } catch {
          return null;
        }
      },
    }
  : {
      // 原生模块未链接（如 Expo Go / 未重新 prebuild）：走纯 TS 降级
      availability: async () => 'unavailable',
      requestPermissions: async () => false,
      readTodaySteps: async () => null,
    };

export default platformSteps;
