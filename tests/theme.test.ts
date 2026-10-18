import { vi, describe, it, expect } from 'vitest';

// normalizeConfig 为纯函数；mock 掉 db 避免 expo-sqlite → react-native（Flow 源码）进入 vitest
vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-10 12:00:00',
  todayString: () => '2026-10-10',
}));

import {
  darkColors,
  lightColors,
  resolveTheme,
  isDarkTheme,
  type ThemeColors,
} from '../src/theme';
import { normalizeConfig } from '../src/services/configStore';

describe('resolveTheme 三态解析', () => {
  it('system：跟随系统外观（dark→darkColors，其余→lightColors）', () => {
    expect(resolveTheme('system', 'dark')).toBe(darkColors);
    expect(resolveTheme('system', 'light')).toBe(lightColors);
    expect(resolveTheme('system', null)).toBe(lightColors);
    expect(resolveTheme('system', undefined)).toBe(lightColors);
  });

  it('light/dark：无视系统外观强制指定', () => {
    expect(resolveTheme('light', 'dark')).toBe(lightColors);
    expect(resolveTheme('dark', 'light')).toBe(darkColors);
    expect(resolveTheme('light', null)).toBe(lightColors);
    expect(resolveTheme('dark', null)).toBe(darkColors);
  });

  it('isDarkTheme 与 resolveTheme 结果一致', () => {
    expect(isDarkTheme('dark', 'light')).toBe(true);
    expect(isDarkTheme('system', 'dark')).toBe(true);
    expect(isDarkTheme('light', 'dark')).toBe(false);
    expect(isDarkTheme('system', 'light')).toBe(false);
    expect(isDarkTheme('system', null)).toBe(false);
  });
});

describe('双主题 token 对等', () => {
  it('lightColors 与 darkColors 键集完全一致', () => {
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('全部 token 值为合法 hex 色值', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const colors of [lightColors, darkColors]) {
      for (const key of Object.keys(colors) as (keyof ThemeColors)[]) {
        expect(colors[key], `${key} 应为 6 位 hex`).toMatch(hex);
      }
    }
  });
});

describe('normalizeConfig theme_preference 兜底', () => {
  it('缺字段/非法值回退 system；合法值保留', () => {
    expect(normalizeConfig(null).theme_preference).toBe('system');
    expect(normalizeConfig({}).theme_preference).toBe('system');
    expect(
      normalizeConfig({ theme_preference: 'neon' as never }).theme_preference
    ).toBe('system');
    expect(normalizeConfig({ theme_preference: 'light' }).theme_preference).toBe('light');
    expect(normalizeConfig({ theme_preference: 'dark' }).theme_preference).toBe('dark');
    expect(normalizeConfig({ theme_preference: 'system' }).theme_preference).toBe('system');
  });
});
