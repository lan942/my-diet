// 全局状态：config + foodCategories + foodItems + intakeLogs + stepLogs + refresh

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { loadConfig, saveConfig } from '../services/configStore';
import { listCategories, listFoodItems, ensureSeedCategories, ensureSeedFoods } from '../services/foodService';
import { listIntake } from '../services/intakeService';
import { listSteps } from '../services/stepService';
import { todayString } from '../db/database';
import type {
  AppConfig,
  FoodCategory,
  FoodItem,
  IntakeLog,
  StepLog,
} from '../types';

interface AppContextValue {
  config: AppConfig | null;
  categories: FoodCategory[];
  foodItems: FoodItem[];
  intakeLogs: IntakeLog[];
  stepLogs: StepLog[];
  currentDate: string;
  loading: boolean;
  // 首启加载失败（config 尚不存在）：展示错误屏并允许重试
  bootError: boolean;
  refresh: () => Promise<void>;
  retryBoot: () => void;
  saveAndRefreshConfig: (cfg: AppConfig) => Promise<void>;
  setCurrentDate: (date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// 种子数据只在 App 生命周期内初始化一次；失败时复位以支持重试
let seedReadyPromise: Promise<void> | null = null;

function ensureSeedsOnce(): Promise<void> {
  if (!seedReadyPromise) {
    seedReadyPromise = (async () => {
      await ensureSeedCategories();
      await ensureSeedFoods();
    })().catch((e) => {
      seedReadyPromise = null;
      throw e;
    });
  }
  return seedReadyPromise;
}

async function bootstrappedLoad(
  date: string
): Promise<[AppConfig, FoodCategory[], FoodItem[], IntakeLog[], StepLog[]]> {
  await ensureSeedsOnce();

  const [cfg, cats, items, intake, steps] = await Promise.all([
    loadConfig(),
    listCategories(),
    listFoodItems(),
    listIntake(date),
    listSteps(),
  ]);
  return [cfg, cats, items, intake, steps];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [currentDate, setCurrentDateState] = useState<string>(todayString());
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(false);
  // 手动重试首启加载
  const [bootTick, setBootTick] = useState(0);

  // 最新日期/config 的同步引用：供无闭包依赖的 refresh 与错误判定使用。
  // 同步 effect 声明在主加载 effect 之前，保证同一 commit 内先于加载执行
  const currentDateRef = useRef(currentDate);
  const configRef = useRef<AppConfig | null>(config);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  // 在途加载序号：后发起的请求使先前请求失效，避免 A 日结果跨日覆盖 B 日页面
  const loadSeqRef = useRef(0);

  const applyLoadResult = useCallback(
    ([cfg, cats, items, intake, steps]: [
      AppConfig,
      FoodCategory[],
      FoodItem[],
      IntakeLog[],
      StepLog[]
    ]) => {
      setConfig(cfg);
      setCategories(cats);
      setFoodItems(items);
      setIntakeLogs(intake);
      setStepLogs(steps);
    },
    []
  );

  const refresh = useCallback(async () => {
    // 原地刷新数据，不置 loading：置 true 会卸载 RootTabs 整棵导航树，
    // 重挂后回到 initialRouteName，表现为「保存后跳回第一个 Tab」
    const seq = ++loadSeqRef.current;
    const result = await bootstrappedLoad(currentDateRef.current);
    // 期间已有更新的加载（如快速切日）接管，丢弃本次过期结果
    if (seq !== loadSeqRef.current) return;
    applyLoadResult(result);
  }, [applyLoadResult]);

  const setCurrentDate = useCallback((date: string) => {
    setCurrentDateState(date);
  }, []);

  const saveAndRefreshConfig = useCallback(
    async (cfg: AppConfig) => {
      await saveConfig(cfg);
      await refresh();
    },
    [refresh]
  );

  const retryBoot = useCallback(() => {
    // 复位种子失败缓存，允许重新初始化（dbPromise 在 database 层失败时也会自复位）
    seedReadyPromise = null;
    setBootError(false);
    setLoading(true);
    setBootTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seq = ++loadSeqRef.current;
    bootstrappedLoad(currentDate)
      .then((result) => {
        if (cancelled || seq !== loadSeqRef.current) return;
        applyLoadResult(result);
        setBootError(false);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled || seq !== loadSeqRef.current) return;
        if (__DEV__) console.warn('[AppContext] bootstrap load failed:', e);
        setLoading(false);
        // 仅首启（尚无 config）进入可重试错误屏；后台刷新失败交由调用方反馈并保留旧数据
        if (configRef.current === null) setBootError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDate, bootTick, applyLoadResult]);

  const value = useMemo<AppContextValue>(
    () => ({
      config,
      categories,
      foodItems,
      intakeLogs,
      stepLogs,
      currentDate,
      loading,
      bootError,
      refresh,
      retryBoot,
      saveAndRefreshConfig,
      setCurrentDate,
    }),
    [
      config,
      categories,
      foodItems,
      intakeLogs,
      stepLogs,
      currentDate,
      loading,
      bootError,
      refresh,
      retryBoot,
      saveAndRefreshConfig,
      setCurrentDate,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp 必须在 AppProvider 内使用');
  }
  return ctx;
}
