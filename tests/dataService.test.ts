// dataService 纯逻辑单测：备份往返、非法拒绝、CSV 转义

import { vi, describe, it, expect } from 'vitest';

// expo/RN 侧模块在 node 环境不可用：IO 函数不在纯逻辑单测范围内，mock 掉依赖
vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: null,
  documentDirectory: null,
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));
vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
  isAvailableAsync: vi.fn(async () => true),
}));
vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(),
}));
vi.mock('../src/db/database', () => ({
  getDb: vi.fn(),
  nowString: () => '2026-10-11 12:00:00',
  todayString: () => '2026-10-11',
  resetAllData: vi.fn(),
  restoreAllData: vi.fn(),
}));

import {
  buildBackup,
  parseBackup,
  buildIntakeCsv,
  BACKUP_VERSION,
} from '../src/services/dataService';
import { BizError, ERR } from '../src/services/errors';
import { DEFAULT_CONFIG } from '../src/services/configStore';
import type { FoodItem, IntakeLog } from '../src/types';

const CONFIG = { ...DEFAULT_CONFIG, onboarded: true };

const FOOD: FoodItem = {
  id: 1,
  name: 'Chicken breast',
  name_en: null,
  category_id: 2,
  kcal_per_100g: 165,
  protein_per_100g: 31,
  carb_per_100g: 0,
  fat_per_100g: 3.6,
  gi: null,
  notes: '',
  notes_en: null,
  portions: [{ zh: '1 掌心大小', en: '1 Palm', grams: 100 }],
  updated_at: null,
};

const INTAKE: IntakeLog[] = [
  {
    id: 1,
    date: '2026-10-11',
    food_item_id: 1,
    grams: 150,
    meal: 'lunch',
    created_at: '2026-10-11 12:00:00',
  },
];

describe('buildBackup / parseBackup 往返', () => {
  it('build → parse 还原全部数据', () => {
    const json = buildBackup(
      CONFIG,
      INTAKE,
      [{ id: 1, date: '2026-10-11', steps: 8000, source: 'manual', created_at: null }],
      [{ id: 2, name: '蛋白质', sort_order: 2 }],
      [FOOD]
    );
    const parsed = parseBackup(json);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.config).toEqual(CONFIG);
    expect(parsed.intake_logs).toEqual(INTAKE);
    expect(parsed.step_logs).toHaveLength(1);
    expect(parsed.food_categories).toEqual([{ id: 2, name: '蛋白质', sort_order: 2 }]);
    expect(parsed.food_items).toEqual([FOOD]);
  });
});

describe('parseBackup 拒绝非法输入', () => {
  it('非 JSON 文本拒绝', () => {
    expect(() => parseBackup('not json')).toThrow(BizError);
    try {
      parseBackup('not json');
    } catch (e) {
      expect((e as BizError).code).toBe(ERR.INVALID_BACKUP);
    }
  });

  it('版本不兼容拒绝', () => {
    const raw = JSON.stringify({ version: 99, config: {}, intake_logs: [], step_logs: [], food_categories: [], food_items: [] });
    expect(() => parseBackup(raw)).toThrow(BizError);
    try {
      parseBackup(raw);
    } catch (e) {
      expect((e as BizError).code).toBe(ERR.BACKUP_VERSION);
    }
  });

  it('缺少数组字段拒绝', () => {
    const raw = JSON.stringify({ version: 1, config: CONFIG, intake_logs: [] });
    expect(() => parseBackup(raw)).toThrow(ERR.INVALID_BACKUP);
  });

  it('记录行缺失必填字段拒绝', () => {
    const raw = JSON.stringify({
      version: 1,
      config: CONFIG,
      intake_logs: [{ id: 1, date: '2026-10-11' }],
      step_logs: [],
      food_categories: [],
      food_items: [],
    });
    expect(() => parseBackup(raw)).toThrow(ERR.INVALID_BACKUP);
  });
});

describe('buildIntakeCsv', () => {
  it('空记录仅含表头', () => {
    const csv = buildIntakeCsv([], []);
    expect(csv).toBe('date,meal,food,grams,kcal,protein_g,carb_g,fat_g');
  });

  it('正常行含换算营养值', () => {
    const csv = buildIntakeCsv(INTAKE, [FOOD]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    // 150g × 165kcal/100g = 247.5
    expect(lines[1]).toBe('2026-10-11,Lunch,Chicken breast,150,247.5,46.5,0,5.4');
  });

  it('逗号与引号转义', () => {
    const food: FoodItem = { ...FOOD, name: 'Salad "mix", deluxe' };
    const csv = buildIntakeCsv(INTAKE, [food]);
    expect(csv.split('\r\n')[1]).toContain('"Salad ""mix"", deluxe"');
  });

  it('已删除食物回退占位名', () => {
    const csv = buildIntakeCsv(INTAKE, []);
    expect(csv.split('\r\n')[1]).toContain('(deleted food)');
  });
});
