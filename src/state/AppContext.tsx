// 全局状态：config + foodCategories + foodItems + intakeLogs + stepLogs + refresh

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  refresh: () => Promise<void>;
  saveAndRefreshConfig: (cfg: AppConfig) => Promise<void>;
  setCurrentDate: (date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// 种子数据只在 App 生命周期内初始化一次
let seedReadyPromise: Promise<void> | null = null;

function ensureSeedsOnce(): Promise<void> {
  if (!seedReadyPromise) {
    seedReadyPromise = (async () => {
      await ensureSeedCategories();
      await ensureSeedFoods();
    })();
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

  const refresh = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [cfg, cats, items, intake, steps] = await bootstrappedLoad(currentDate);
      setConfig(cfg);
      setCategories(cats);
      setFoodItems(items);
      setIntakeLogs(intake);
      setStepLogs(steps);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const setCurrentDate = useCallback((date: string) => {
    setCurrentDateState(date);
  }, []);

  const saveAndRefreshConfig = useCallback(async (cfg: AppConfig) => {
    await saveConfig(cfg);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    bootstrappedLoad(currentDate)
      .then(([cfg, cats, items, intake, steps]) => {
        if (cancelled) return;
        setConfig(cfg);
        setCategories(cats);
        setFoodItems(items);
        setIntakeLogs(intake);
        setStepLogs(steps);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDate]);

  const value = useMemo<AppContextValue>(
    () => ({
      config,
      categories,
      foodItems,
      intakeLogs,
      stepLogs,
      currentDate,
      loading,
      refresh,
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
      refresh,
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
