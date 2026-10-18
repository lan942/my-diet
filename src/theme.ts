// 主题 tokens：双主题（浅色/深色）+ 运行时切换
// 纯 TS 模块（不 import react-native），保证 vitest node 环境可直接测试

import type { ThemePreference } from './types';

export type { ThemePreference };

export interface ThemeColors {
  bg: string;
  card: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  surfaceSoft: string;
  ok: string;
  warn: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  bg: '#f4f7f4',
  card: '#ffffff',
  line: '#e2e9e3',
  text: '#1e2b24',
  muted: '#68766d',
  accent: '#34785b',
  accentSoft: '#e7f2eb',
  surfaceSoft: '#f8faf8',
  ok: '#16a34a',
  warn: '#f59e0b',
  danger: '#dc2626',
};

// 深色 token 定稿（清理股票 app 残留键 sell/buy/warnBg/okBg/triggerBg）
export const darkColors: ThemeColors = {
  bg: '#0F172A',
  card: '#1E293B',
  line: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  accent: '#818CF8',
  accentSoft: '#312E81',
  surfaceSoft: '#0B1220',
  ok: '#34D399',
  warn: '#FBBF24',
  danger: '#F87171',
};

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
): ThemeColors {
  const effective = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  return effective === 'dark' ? darkColors : lightColors;
}

export function isDarkTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
): boolean {
  return resolveTheme(preference, systemScheme) === darkColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

export const typeScale = {
  caption: 12,
  body: 15,
  title: 18,
  heading: 22,
};

// 宏量营养素专属语义色：环形图/进度条/目标卡全局统一（双主题共用）
export const macroColors = {
  calorie: '#FF6B4A', // 总热量：活力橙
  protein: '#6366F1', // 蛋白质：深海蓝
  fat: '#F59E0B', // 脂肪：琥珀金
  carb: '#10B981', // 碳水：翡翠绿
  steps: '#06B6D4', // 步数：霓虹青
};

// 卡片微投影（Modern & Premium Soft Card，仅浅色）
export const cardShadowLight = {
  shadowColor: '#254a35',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

// 深色下卡片用 1px line 描边替代阴影
export function cardOutline(colors: ThemeColors, isDark: boolean) {
  return isDark ? { borderWidth: 1, borderColor: colors.line } : cardShadowLight;
}
