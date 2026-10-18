import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeColors, ThemePreference } from '../theme';
import { lightColors, resolveTheme } from '../theme';
import { useApp } from '../state/AppContext';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FALLBACK: ThemeContextValue = {
  colors: lightColors,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
};

// 偏好单一数据源 = AppContext.config.theme_preference：
// 恢复备份/任何 config 变更经 saveAndRefreshConfig 单链写入，主题随 refresh 自动生效，
// 避免独立 loadConfig/saveConfig 造成的 read-modify-write 竞争与状态脱节
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { config, saveAndRefreshConfig } = useApp();
  const preference = config?.theme_preference ?? 'system';

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      if (!config) return;
      saveAndRefreshConfig({ ...config, theme_preference: pref }).catch(() => {});
    },
    [config, saveAndRefreshConfig]
  );

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = systemScheme === 'dark' ? 'dark' : 'light';
    const colors = resolveTheme(preference, scheme);
    return {
      colors,
      isDark: colors !== lightColors,
      preference,
      setPreference,
    };
  }, [preference, systemScheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// 无 Provider 环境（测试）回退浅色，保证既有组件测试零改动
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx ?? FALLBACK;
}
