// Android 实现：Health Connect（react-native-health-connect）
// 只读（READ_STEPS），权限仅由用户主动触发连接时请求

import {
  getSdkStatus,
  SdkAvailabilityStatus,
  initialize,
  requestPermission,
  aggregateRecord,
} from 'react-native-health-connect';
import {
  dayRangeForDate,
  parseStepsAggregate,
  type PlatformSteps,
  type PlatformStepsAvailability,
} from './platformSteps';

let initPromise: Promise<boolean> | null = null;

function ensureInitialized(): Promise<boolean> {
  if (!initPromise) {
    // 失败时复位缓存：用户可能在 App 运行期间安装/更新 Health Connect，需要允许重试
    initPromise = initialize()
      .then(() => true)
      .catch((e) => {
        if (__DEV__) console.warn('[platformSteps] Health Connect initialize failed:', e);
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

function warnError(scope: string, e: unknown): void {
  if (__DEV__) console.warn(`[platformSteps] ${scope} failed:`, e);
}

function mapStatus(status: number): PlatformStepsAvailability {
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return 'update_required';
  }
  return 'unavailable';
}

export const platformSteps: PlatformSteps = {
  availability: async () => {
    try {
      return mapStatus(await getSdkStatus());
    } catch (e) {
      warnError('getSdkStatus', e);
      return 'unavailable';
    }
  },

  requestPermissions: async () => {
    try {
      if ((await platformSteps.availability()) !== 'available') return false;
      if (!(await ensureInitialized())) return false;
      const granted = await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);
      return granted.some(
        (p) => p.accessType === 'read' && p.recordType === 'Steps'
      );
    } catch (e) {
      warnError('requestPermission', e);
      return false;
    }
  },

  readStepsForDate: async (date: string) => {
    try {
      if ((await platformSteps.availability()) !== 'available') return null;
      if (!(await ensureInitialized())) return null;
      const range = dayRangeForDate(date);
      const result = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: range.startTime,
          endTime: range.endTime,
        },
      });
      return parseStepsAggregate(result);
    } catch (e) {
      warnError('aggregateRecord', e);
      return null;
    }
  },
};

export default platformSteps;
