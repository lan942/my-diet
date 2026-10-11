// 数据导出/导入/清空重置：纯逻辑（buildBackup/parseBackup/buildIntakeCsv，vitest 可测）+ 本地文件 IO
// 全程离线，不上传任何数据

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { clearIntakeLogs, restoreAllData, resetAllData } from '../db/database';
import { DEFAULT_CONFIG, loadConfig, normalizeConfig, validateConfig } from './configStore';
import {
  ensureSeedCategories,
  ensureSeedFoods,
  foodDisplayName,
  listCategories,
  listFoodItems,
  parsePortions,
} from './foodService';
import { listAllIntake } from './intakeService';
import { listSteps } from './stepService';
import { BizError, ERR } from './errors';
import { t, type TranslationKey } from '../i18n';
import type {
  AppConfig,
  BackupData,
  FoodCategory,
  FoodItem,
  FoodPortion,
  IntakeLog,
  StepLog,
} from '../types';

export class DataError extends BizError {}

export const BACKUP_VERSION = 1;

const MEAL_KEYS: Record<string, TranslationKey> = {
  breakfast: 'meal.breakfast',
  lunch: 'meal.lunch',
  dinner: 'meal.dinner',
  snack: 'meal.snack',
};

// ============ 纯逻辑（可测） ============

export function buildBackup(
  config: AppConfig,
  intakeLogs: IntakeLog[],
  stepLogs: StepLog[],
  categories: FoodCategory[],
  items: FoodItem[]
): string {
  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    config,
    intake_logs: intakeLogs,
    step_logs: stepLogs,
    food_categories: categories,
    food_items: items,
  };
  return JSON.stringify(data, null, 2);
}

function asRow(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DataError(ERR.INVALID_BACKUP);
  }
  return value as Record<string, unknown>;
}

function reqString(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (typeof v !== 'string' || !v) throw new DataError(ERR.INVALID_BACKUP);
  return v;
}

function reqNumber(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new DataError(ERR.INVALID_BACKUP);
  }
  return v;
}

function optString(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new DataError(ERR.INVALID_BACKUP);
  return v;
}

function optNumber(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new DataError(ERR.INVALID_BACKUP);
  }
  return v;
}

function reqArray(raw: Record<string, unknown>, key: string): unknown[] {
  const v = raw[key];
  if (!Array.isArray(v)) throw new DataError(ERR.INVALID_BACKUP);
  return v;
}

function mapBackupRow<T>(list: unknown[], map: (row: Record<string, unknown>) => T): T[] {
  return list.map((item) => map(asRow(item)));
}

// portions 备份兼容：新备份存数组，旧版本为 JSON 字符串或缺失；非法 → null
function parsePortionsBackup(v: unknown): FoodPortion[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const arr = v as FoodPortion[];
    if (arr.length === 0 || arr.some((p) => !p || typeof p.grams !== 'number' || p.grams <= 0)) {
      return null;
    }
    return arr;
  }
  if (typeof v === 'string') return parsePortions(v);
  return null;
}

/** 解析并结构校验备份 JSON；版本不兼容与字段缺失分别报错，失败不触碰数据库 */
export function parseBackup(json: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new DataError(ERR.INVALID_BACKUP);
  }
  const root = asRow(raw);
  const version = root.version;
  if (typeof version !== 'number') throw new DataError(ERR.INVALID_BACKUP);
  if (version !== BACKUP_VERSION) throw new DataError(ERR.BACKUP_VERSION);

  return {
    version,
    exportedAt: optString(root, 'exportedAt') ?? '',
    config: asRow(root.config) as unknown as AppConfig,
    intake_logs: mapBackupRow(reqArray(root, 'intake_logs'), (r) => ({
      id: reqNumber(r, 'id'),
      date: reqString(r, 'date'),
      food_item_id: reqNumber(r, 'food_item_id'),
      grams: reqNumber(r, 'grams'),
      meal: reqString(r, 'meal'),
      created_at: optString(r, 'created_at'),
    })),
    step_logs: mapBackupRow(reqArray(root, 'step_logs'), (r) => ({
      id: reqNumber(r, 'id'),
      date: reqString(r, 'date'),
      steps: reqNumber(r, 'steps'),
      source: reqString(r, 'source') === 'platform' ? 'platform' : 'manual',
      created_at: optString(r, 'created_at'),
    })),
    food_categories: mapBackupRow(reqArray(root, 'food_categories'), (r) => ({
      id: reqNumber(r, 'id'),
      name: reqString(r, 'name'),
      sort_order: reqNumber(r, 'sort_order'),
    })),
    food_items: mapBackupRow(reqArray(root, 'food_items'), (r) => ({
      id: reqNumber(r, 'id'),
      name: reqString(r, 'name'),
      name_en: optString(r, 'name_en'), // 旧版本备份无此字段
      category_id: reqNumber(r, 'category_id'),
      kcal_per_100g: reqNumber(r, 'kcal_per_100g'),
      protein_per_100g: reqNumber(r, 'protein_per_100g'),
      carb_per_100g: reqNumber(r, 'carb_per_100g'),
      fat_per_100g: reqNumber(r, 'fat_per_100g'),
      gi: optNumber(r, 'gi'),
      notes: optString(r, 'notes') ?? '',
      notes_en: optString(r, 'notes_en'), // 旧版本备份无此字段
      portions: parsePortionsBackup(r.portions), // 新备份为数组，旧备份为字符串或缺失
      updated_at: optString(r, 'updated_at'),
    })),
  };
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvNum(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** 摄入记录 CSV：date,meal,food,grams,kcal,protein_g,carb_g,fat_g */
export function buildIntakeCsv(intakeLogs: IntakeLog[], foodItems: FoodItem[]): string {
  const header = 'date,meal,food,grams,kcal,protein_g,carb_g,fat_g';
  const byId = new Map(foodItems.map((f) => [f.id, f]));
  const lines = intakeLogs.map((log) => {
    const mealKey = MEAL_KEYS[log.meal];
    const meal = mealKey ? t(mealKey) : log.meal;
    const food = byId.has(log.food_item_id)
      ? foodDisplayName(byId.get(log.food_item_id)!)
      : t('intake.deletedFood');
    const item = byId.get(log.food_item_id);
    const factor = log.grams / 100;
    const kcal = item ? item.kcal_per_100g * factor : 0;
    const protein = item ? item.protein_per_100g * factor : 0;
    const carb = item ? item.carb_per_100g * factor : 0;
    const fat = item ? item.fat_per_100g * factor : 0;
    return [
      log.date,
      csvEscape(meal),
      csvEscape(food),
      csvNum(log.grams),
      csvNum(kcal),
      csvNum(protein),
      csvNum(carb),
      csvNum(fat),
    ].join(',');
  });
  return [header, ...lines].join('\r\n');
}

// ============ 文件 IO ============

function timestampName(ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
}

async function writeAndShare(content: string, filename: string, mimeType: string): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new DataError(ERR.INVALID_BACKUP);
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, { mimeType });
}

/** 收集全库数据 → JSON 备份 → 系统分享面板 */
export async function exportBackupFile(): Promise<void> {
  const [config, intakeLogs, stepLogs, categories, items] = await Promise.all([
    loadConfig(),
    listAllIntake(),
    listSteps(),
    listCategories(),
    listFoodItems(),
  ]);
  await writeAndShare(
    buildBackup(config, intakeLogs, stepLogs, categories, items),
    `nutripulse-backup-${timestampName('json')}`,
    'application/json'
  );
}

/** 全部摄入记录 → CSV → 系统分享面板 */
export async function exportIntakeCsvFile(): Promise<void> {
  const [intakeLogs, items] = await Promise.all([listAllIntake(), listFoodItems()]);
  await writeAndShare(
    buildIntakeCsv(intakeLogs, items),
    `nutripulse-intake-${timestampName('csv')}`,
    'text/csv'
  );
}

/** 选择备份文件：取消返回 null；否则读取并校验 */
export async function pickAndParseBackup(): Promise<BackupData | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || res.assets.length === 0) return null;
  const content = await FileSystem.readAsStringAsync(res.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return parseBackup(content);
}

/** 备份覆盖恢复（配置归一化校验后单事务写入），失败零副作用 */
export async function restoreFromBackup(): Promise<BackupData | null> {
  const data = await pickAndParseBackup();
  if (!data) return null;
  try {
    validateConfig(normalizeConfig(data.config));
  } catch {
    throw new DataError(ERR.BACKUP_CONFIG);
  }
  await restoreAllData(data);
  return data;
}

/** 清空重置：全部表清空 + 配置默认（onboarded=false）+ 重新播种 */
export async function resetEverything(): Promise<void> {
  await resetAllData(JSON.stringify(DEFAULT_CONFIG));
  await ensureSeedCategories();
  await ensureSeedFoods();
}

/** 仅清空摄入记录：保留配置、步数与食物库，不触发首启引导 */
export async function clearIntakeData(): Promise<void> {
  await clearIntakeLogs();
}
