// 系统语言检测（依赖 react-native/expo-localization，仅在 App 入口引入执行一次）
// expo-localization 跨平台可靠（Android 新架构下老 NativeModules 常量可达性不稳定）；
// 两条链路都失败时保持核心 i18n 的默认值 en。

import { NativeModules, Platform } from 'react-native';
import * as Localization from 'expo-localization';

import { resolveLocale, setLocale } from './index';

function deviceLocaleIdentifier(): string | undefined {
  try {
    // 1) expo-localization：getLocales()[0].languageTag（如 zh-CN / en-US）
    const locales = Localization.getLocales?.();
    const tag = locales?.[0]?.languageTag;
    if (tag) return tag;
  } catch {
    // 走 fallback
  }
  try {
    // 2) RN 内核 fallback（expo-localization 异常时兜底）
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      return settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
    }
    return NativeModules.I18nManager?.localeIdentifier;
  } catch {
    return undefined;
  }
}

export function detectAndApplyLocale(): void {
  setLocale(resolveLocale(deviceLocaleIdentifier()));
}

// 入口 side-effect import 即生效（import './src/i18n/detect'）
detectAndApplyLocale();
