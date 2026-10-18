// 今日页设备步数的唯一数据出口：
// - 可用性静默探测（不索权）；授权仅由用户点「连接」触发
// - 授权后在页面 focus / App 回前台 / 切日时自动读取当前查看日期（支持历史日期）
// - 同日期读取单飞、15s 成功节流、seq 令牌丢弃跨日期迟到结果
// - 当日为 manual 行（用户显式覆盖值）时跳过平台写入，清除后恢复
// - 写入成功后原地 refresh（严禁 setLoading，避免导航树卸载跳 Tab）

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useApp } from '../state/AppContext';
import {
  platformSteps,
  type PlatformStepsAvailability,
} from '../services/platformSteps';
import { recordPlatformSteps } from '../services/stepService';
import { getStepsConnection, setStepsConnected } from '../services/connectionStore';
import type { StepSource } from '../types';

export type StepSyncUiState =
  | 'unavailable'
  | 'not-connected'
  | 'syncing'
  | 'connected'
  | 'denied';

export type ConnectResult = 'granted' | 'denied' | 'unavailable';
export type SyncResult =
  | { ok: true; steps: number }
  | { ok: false; reason: 'denied' | 'unavailable' | 'manual-override' };

const SUCCESS_THROTTLE_MS = 15_000;

export interface DeviceSteps {
  availability: PlatformStepsAvailability | 'unknown';
  syncState: StepSyncUiState;
  steps: number | null;
  /** 当前查看日期记录来源：manual=用户显式覆盖，platform=平台同步，null=无记录 */
  source: StepSource | null;
  connect: () => Promise<ConnectResult>;
  syncNow: () => Promise<SyncResult>;
}

export function useDeviceSteps(date: string): DeviceSteps {
  const { stepLogs, refresh } = useApp();
  const [availability, setAvailability] = useState<
    PlatformStepsAvailability | 'unknown'
  >('unknown');
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [denied, setDenied] = useState(false);

  // 最新日期（effect 内更新，供 AppState 监听等无闭包依赖的读取使用）
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  // 单调递增序号：后发起的同步使先前同步的 UI 收尾失效
  const seqRef = useRef(0);
  // 同日期在途读取合并（单飞）
  const inFlightRef = useRef<Map<string, Promise<number | null>>>(new Map());
  // 各日期上次成功读取时间戳（节流）
  const lastSuccessAtRef = useRef<Map<string, number>>(new Map());

  // stepLogs 镜像 ref：供 syncDate 等稳定回调读取当日来源，避免回调身份随数据变化
  const stepLogsRef = useRef(stepLogs);
  useEffect(() => {
    stepLogsRef.current = stepLogs;
  }, [stepLogs]);

  // 当前查看日期步数与来源：本地 step_log 为唯一展示来源，同步写入经 refresh 后更新
  const steps = useMemo(
    () => stepLogs.find((s) => s.date === date)?.steps ?? null,
    [stepLogs, date]
  );
  const source = useMemo<StepSource | null>(
    () => stepLogs.find((s) => s.date === date)?.source ?? null,
    [stepLogs, date]
  );

  const probe = useCallback(async (): Promise<PlatformStepsAvailability> => {
    try {
      const s = await platformSteps.availability();
      setAvailability(s);
      return s;
    } catch {
      setAvailability('unavailable');
      return 'unavailable';
    }
  }, []);

  // 读取平台聚合值并落库；同日期并发复用同一 Promise
  const readAndStore = useCallback(
    async (d: string): Promise<number | null> => {
      const existing = inFlightRef.current.get(d);
      if (existing) return existing;
      const p = (async () => {
        try {
          const read = await platformSteps.readStepsForDate(d);
          if (read === null) return null; // 未授权/不可用/失败：静默不写
          await recordPlatformSteps(d, read);
          return read;
        } catch {
          return null;
        } finally {
          inFlightRef.current.delete(d);
        }
      })();
      inFlightRef.current.set(d, p);
      return p;
    },
    []
  );

  const syncDate = useCallback(
    async (d: string, manual: boolean): Promise<number | null> => {
      // manual 行为用户显式覆盖值：跳过平台同步（含授权后的强制同步），清除后恢复
      const existing = stepLogsRef.current.find((s) => s.date === d);
      if (existing?.source === 'manual') return null;
      if (!manual) {
        const last = lastSuccessAtRef.current.get(d) ?? 0;
        if (Date.now() - last < SUCCESS_THROTTLE_MS) return null;
      }
      const seq = ++seqRef.current;
      if (dateRef.current === d) setSyncing(true);
      let read: number | null = null;
      try {
        read = await readAndStore(d);
        if (read !== null) {
          lastSuccessAtRef.current.set(d, Date.now());
          await refresh();
        }
      } finally {
        if (seq === seqRef.current && dateRef.current === d) {
          setSyncing(false);
        }
      }
      return read;
    },
    [readAndStore, refresh]
  );

  // 挂载时并行加载可用性与连接标志（均不触发权限弹窗）
  useEffect(() => {
    let active = true;
    void (async () => {
      const [s, isConnected] = await Promise.all([
        platformSteps.availability().catch(
          (): PlatformStepsAvailability => 'unavailable'
        ),
        getStepsConnection().catch(() => false),
      ]);
      if (!active) return;
      setAvailability(s);
      setConnected(isConnected);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 回前台：重新探测可用性，已连接则自动同步当前查看日期
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        const s = await probe();
        if (s !== 'available') return;
        const isConnected = await getStepsConnection().catch(() => false);
        if (!isConnected) return;
        void syncDate(dateRef.current, false);
      })();
    });
    return () => sub.remove();
  }, [probe, syncDate]);

  // 页面 focus / 日期变化 / 可用性或连接状态就绪：自动读取
  useFocusEffect(
    useCallback(() => {
      if (availability !== 'available' || !connected) return;
      void syncDate(date, false);
    }, [availability, connected, date, syncDate])
  );

  // 唯一会触发系统权限弹窗的入口
  const connect = useCallback(async (): Promise<ConnectResult> => {
    const s = await probe();
    if (s !== 'available') return 'unavailable';
    let granted = false;
    try {
      granted = await platformSteps.requestPermissions();
    } catch {
      granted = false;
    }
    if (!granted) {
      setDenied(true);
      return 'denied';
    }
    setDenied(false);
    await setStepsConnected(true).catch(() => {});
    setConnected(true);
    // 授权成功即强制同步当日（清节流）；聚合瞬时为 null 时后续自动时机重试
    await syncDate(dateRef.current, true);
    return 'granted';
  }, [probe, syncDate]);

  // 已连接用户的手动刷新（撤销授权/读取失败时暴露 denied；manual 日返回跳过标记）
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    // manual 日提前早退：省一次平台可用性探测
    const existing = stepLogsRef.current.find(
      (x) => x.date === dateRef.current
    );
    if (existing?.source === 'manual') {
      return { ok: false, reason: 'manual-override' };
    }
    const s = await probe();
    if (s !== 'available') return { ok: false, reason: 'unavailable' };
    const read = await syncDate(dateRef.current, true);
    if (read === null) {
      setDenied(true);
      return { ok: false, reason: 'denied' };
    }
    setDenied(false);
    return { ok: true, steps: read };
  }, [probe, syncDate]);

  const syncState = useMemo<StepSyncUiState>(() => {
    if (availability === 'unavailable') return 'unavailable';
    if (syncing) return 'syncing';
    if (denied) return 'denied';
    if (connected) return 'connected';
    return 'not-connected';
  }, [availability, syncing, denied, connected]);

  return { availability, syncState, steps, source, connect, syncNow };
}
