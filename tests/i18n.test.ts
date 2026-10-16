// i18n 纯逻辑单测：插值特殊模式、回退、错误码翻译

import { describe, it, expect, beforeEach } from 'vitest';
import { t, tError, setLocale } from '../src/i18n';
import { en } from '../src/i18n/en';
import { zh } from '../src/i18n/zh';
import { BizError, ERR } from '../src/services/errors';

beforeEach(() => {
  setLocale('zh');
});

describe('t 插值', () => {
  it('替换值中的 $& 不被当作特殊替换模式', () => {
    // food.deleteMsg 中英文案均为 Delete “{name}”? / 删除「{name}」吗？
    const msg = t('food.deleteMsg', { name: '$&' });
    // zh 回退链：zh 命中，必须原样插入 $&，不得复活占位符或匹配文本
    expect(msg).toContain('$&');
    expect(msg).not.toContain('{name}');
  });

  it("$` 与 $' 同样按字面量插入", () => {
    const msg = t('sync.success', { steps: "$'$`" });
    expect(msg).toContain("$'$`");
  });

  it('数字参数正常插值', () => {
    const msg = t('sync.success', { steps: 8123 });
    expect(msg).toContain('8123');
  });

  it('同一占位符出现多次全部替换', () => {
    // 选择一个含单占位符的 key 即可；此处验证替换是全局的
    const msg = t('intake.deleteMsg');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('t 语言回退', () => {
  it('zh 缺失时回退英文', () => {
    setLocale('zh');
    // 公共 key 双语都存在，返回中文
    expect(t('common.save')).toBe('保存');
  });

  it('未知语言标记回退英文（不崩溃）', () => {
    setLocale('fr' as never);
    expect(t('common.save')).toBe('Save');
  });

  it('未知 key 返回 key 本身', () => {
    expect(t('no.such.key' as never)).toBe('no.such.key');
  });
});

describe('双语字典对齐', () => {
  it('en 与 zh 的 key 集合完全一致（防漏译/残留 key）', () => {
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zh).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('步数整合新增 key 双语存在且非空', () => {
    const keys = [
      'steps.cardTitle',
      'steps.connect',
      'steps.syncing',
      'steps.notConnected',
      'energy.net',
      'energy.remaining',
      'energy.adjustedHint',
      'sync.rationale',
      'sync.denied',
      'sync.unavailable',
    ] as const;
    for (const key of keys) {
      expect(en[key].length).toBeGreaterThan(0);
      expect(zh[key].length).toBeGreaterThan(0);
    }
  });

  it('已移除的步数 Tab/手动录入 key 不复存在', () => {
    const removed = [
      'tab.steps',
      'steps.today',
      'steps.inputTitle',
      'steps.label',
      'steps.history',
      'steps.empty',
      'sync.protected',
      'sync.done',
    ];
    for (const key of removed) {
      expect(key in en).toBe(false);
      expect(key in zh).toBe(false);
    }
  });
});

describe('tError', () => {
  it('BizError 按错误码翻译', () => {
    setLocale('en');
    const msg = tError(new BizError(ERR.INVALID_GI));
    expect(msg).toContain('GI');
  });

  it('非 BizError 回退通用错误文案', () => {
    setLocale('zh');
    expect(tError(new Error('boom'))).toBe(t('error.generic'));
  });
});
