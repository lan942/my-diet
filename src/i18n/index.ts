// i18n 核心（不依赖 react-native，可在 vitest node 环境使用）

import { en, type TranslationKey, type TranslationParams } from './en';
import { zh } from './zh';

export type Locale = 'en' | 'zh';

export type { TranslationKey, TranslationParams };

const DICTS: Record<Locale, Record<string, string>> = { en, zh };

let currentLocale: Locale = 'en';

/** 运行时语言（App 启动时由 detect.ts 检测；测试中可显式 setLocale） */
export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/** 系统原始 locale 标识 → 支持语言（zh* → zh，其余一律回退 en） */
export function resolveLocale(identifier: string | undefined | null): Locale {
  if (identifier && /^zh\b|^zh[-_]/i.test(identifier)) return 'zh';
  return 'en';
}

/** Intl locale 标识（用于日期/数字格式化） */
export function intlLocale(): string {
  return currentLocale === 'zh' ? 'zh-CN' : 'en-US';
}

/** 翻译：{param} 占位符插值；缺 key 时回退 en，仍缺失则返回 key 本身 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const dict = DICTS[currentLocale];
  let text = dict[key] ?? DICTS.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
  }
  return text;
}

/** 业务 Error 上的 code → 本地化文案；无 code 时回退通用文案 */
export function tError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && typeof code === 'string' && code in DICTS.en) {
    return t(code as TranslationKey);
  }
  return t('error.generic');
}

/** 数字按 locale 千分位格式化（SQLite 存储不受影响） */
export function formatNumber(n: number): string {
  return n.toLocaleString(intlLocale());
}

/** YYYY-MM-DD → locale 短日期（如 Oct 10 / 10月10日）；仅用于展示 */
export function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat(intlLocale(), {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function useLocale(): Locale {
  return currentLocale;
}
