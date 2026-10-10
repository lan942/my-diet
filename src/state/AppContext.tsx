// 全局状态：config + weights + foodCategories + foodItems + intakeLogs + stepLogs + refresh

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { loadConfig } from '../services/configStore';
import { listWeights } from '../services/weightService';
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
  WeightRecord,
} from '../types';

interface AppContextValue {
  config: AppConfig | null;
  weights: WeightRecord[];
  categories: FoodCategory[];
  foodItems: FoodItem[];
  intakeLogs: IntakeLog[];
  stepLogs: StepLog[];
  currentDate: string;
  loading: boolean;
  refresh: () => Promise<void>;
  setCurrentDate: (date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function bootstrappedLoad(
  date: string
): Promise<[AppConfig, WeightRecord[], FoodCategory[], FoodItem[], IntakeLog[], StepLog[]]> {
  // 确保种子数据存在（幂等）
  await ensureSeedCategories();
  await ensureSeedFoods();

  const [cfg, w, cats, items, intake, steps] = await Promise.all([
    loadConfig(),
    listWeights(),
    listCategories(),
    listFoodItems(),
    listIntake(date),
    listSteps(),
  ]);
  return [cfg, w, cats, items, intake, steps];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
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
      const [cfg, w, cats, items, intake, steps] = await bootstrappedLoad(currentDate);
      setConfig(cfg);
      setWeights(w);
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

  useEffect(() => {
    let cancelled = false;
    bootstrappedLoad(currentDate)
      .then(([cfg, w, cats, items, intake, steps]) => {
        if (cancelled) return;
        setConfig(cfg);
        setWeights(w);
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
      weights,
      categories,
      foodItems,
      intakeLogs,
      stepLogs,
      currentDate,
      loading,
      refresh,
      setCurrentDate,
    }),
    [
      config,
      weights,
      categories,
      foodItems,
      intakeLogs,
      stepLogs,
      currentDate,
      loading,
      refresh,
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
