// Android 实现：Health Connect（react-native-health-connect）
// 只读（READ_STEPS），权限仅由用户主动触发同步时请求

import {
  getSdkStatus,
  SdkAvailabilityStatus,
  initialize,
  requestPermission,
  aggregateRecord,
} from 'react-native-health-connect';
import {
  parseStepsAggregate,
  todayDayRange,
  type PlatformSteps,
  type PlatformStepsAvailability,
} from './platformSteps';

let initPromise: Promise<boolean> | null = null;

function ensureInitialized(): Promise<boolean> {
  if (!initPromise) {
    initPromise = initialize().catch(() => false);
  }
  return initPromise;
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
    } catch {
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
    } catch {
      return false;
    }
  },

  readTodaySteps: async () => {
    try {
      if ((await platformSteps.availability()) !== 'available') return null;
      if (!(await ensureInitialized())) return null;
      const range = todayDayRange();
      const result = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: range.startTime,
          endTime: range.endTime,
        },
      });
      return parseStepsAggregate(result);
    } catch {
      return null;
    }
  },
};

export default platformSteps;
