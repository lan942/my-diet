// 「我的」页：设置与目标（4 张摘要卡 + 单步编辑抽屉）+ 偏好与数据（单位/导出/导入/清空）
// 编辑抽屉复用首启引导组件（src/components/onboarding/*），保存即生效并实时联动首页

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import SegmentedControl from '../components/SegmentedControl';
import AnimatedNumber from '../components/AnimatedNumber';
import EditSheet from '../components/EditSheet';
import ActionSheet from '../components/ActionSheet';
import Toast, { useToast } from '../components/Toast';
import GoalPresetCards from '../components/onboarding/GoalPresetCards';
import BodyMetricsRulers from '../components/onboarding/BodyMetricsRulers';
import GenderOptionCards from '../components/onboarding/GenderOptionCards';
import ActivityLevelRows from '../components/onboarding/ActivityLevelRows';
import { colors, spacing, macroColors, cardShadow } from '../theme';
import { useApp } from '../state/AppContext';
import { t, tError, formatNumber, type TranslationKey } from '../i18n';
import {
  computeTarget,
  ACTIVITY_LEVELS,
  GOAL_PRESETS,
  type GoalPreset,
} from '../services/targetService';
import {
  clearIntakeData,
  exportBackupFile,
  exportIntakeCsvFile,
  restoreFromBackup,
  resetEverything,
} from '../services/dataService';
import { kgToLb, cmToFtIn } from '../services/unit';
import type { Gender, UnitSystem } from '../types';

type SheetKind = 'goal' | 'body' | 'gender' | 'activity';

// PREFERENCES & DATA 的底部操作抽屉类型（reset 两段式：scope 选范围 → intake/all 二次确认）
type ActionKind = 'export' | 'import' | 'reset-scope' | 'reset-intake' | 'reset-all';

const GENDER_KEYS: Record<Gender, TranslationKey> = {
  male: 'gender.male',
  female: 'gender.female',
  unknown: 'gender.unknown',
};

const SHEET_HINTS: Record<SheetKind, TranslationKey> = {
  goal: 'onboarding.hint.1',
  body: 'onboarding.hint.2',
  gender: 'onboarding.hint.3',
  activity: 'onboarding.hint.4',
};

const SHEET_TITLES: Record<SheetKind, TranslationKey> = {
  goal: 'settings.sheet.goalTitle',
  body: 'settings.sheet.bodyTitle',
  gender: 'settings.sheet.genderTitle',
  activity: 'settings.sheet.activityTitle',
};

function ratioApproxEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}

export default function ProfileScreen() {
  const { config, refresh, saveAndRefreshConfig } = useApp();

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const { toast, toastOpacity, showToast } = useToast();

  // 导出/导入/清空等 IO 操作的统一错误反馈（非阻塞轻提示）
  async function runIo(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (e: unknown) {
      showToast(tError(e));
    }
  }
  // 各抽屉草稿（打开时从 config 拷贝，Save 单点提交）
  const [goalDraft, setGoalDraft] = useState<GoalPreset>(GOAL_PRESETS[0]);
  const [bodyDraft, setBodyDraft] = useState({
    age: 30,
    heightCm: 170,
    weightKg: 70,
    unit: 'metric' as UnitSystem,
  });
  const [genderDraft, setGenderDraft] = useState<Gender>('unknown');
  const [activityDraft, setActivityDraft] = useState(1.2);

  const target = config ? computeTarget(config) : null;

  const activePreset = useMemo(() => {
    if (!config) return undefined;
    return GOAL_PRESETS.find(
      (p) =>
        ratioApproxEqual(p.carb, config.carb_ratio) &&
        ratioApproxEqual(p.protein, config.protein_ratio) &&
        ratioApproxEqual(p.fat, config.fat_ratio)
    );
  }, [config]);

  const activityLevel = useMemo(() => {
    if (!config) return null;
    return (
      ACTIVITY_LEVELS.find((l) => ratioApproxEqual(l.factor, config.activity_factor)) ?? null
    );
  }, [config]);

  // 摘要文字（从 config 派生）
  const goalLabel = activePreset
    ? t(activePreset.label)
    : t('profile.presetRatio', {
        p: Math.round((config?.protein_ratio ?? 0) * 100),
        f: Math.round((config?.fat_ratio ?? 0) * 100),
        c: Math.round((config?.carb_ratio ?? 0) * 100),
      });
  const bodySummary = useMemo(() => {
    if (!config) return '';
    const age = `${config.age} ${t('unit.age')}`;
    if (config.unit_system === 'us') {
      const { ft, in: inch } = cmToFtIn(config.height_cm);
      return `${age} • ${ft}′${inch}″ • ${kgToLb(config.weight_kg)} ${t('unit.lb')}`;
    }
    return `${age} • ${config.height_cm} ${t('unit.cm')} • ${config.weight_kg} ${t('unit.kg')}`;
  }, [config]);
  const genderSummary = config ? t(GENDER_KEYS[config.gender]) : '';
  const activitySummary = activityLevel
    ? `${t(activityLevel.label)} (×${activityLevel.factor})`
    : `×${config?.activity_factor ?? ''}`;

  function openSheet(kind: SheetKind) {
    if (!config) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSheetError('');
    if (kind === 'goal') {
      setGoalDraft(activePreset ?? GOAL_PRESETS[0]);
    } else if (kind === 'body') {
      setBodyDraft({
        age: config.age,
        heightCm: config.height_cm,
        weightKg: config.weight_kg,
        unit: config.unit_system,
      });
    } else if (kind === 'gender') {
      setGenderDraft(config.gender);
    } else {
      setActivityDraft(config.activity_factor);
    }
    setSheet(kind);
  }

  async function saveSheet() {
    if (!config || !sheet) return;
    setSaving(true);
    try {
      if (sheet === 'goal') {
        await saveAndRefreshConfig({
          ...config,
          carb_ratio: goalDraft.carb,
          protein_ratio: goalDraft.protein,
          fat_ratio: goalDraft.fat,
        });
      } else if (sheet === 'body') {
        await saveAndRefreshConfig({
          ...config,
          age: bodyDraft.age,
          height_cm: bodyDraft.heightCm,
          weight_kg: bodyDraft.weightKg,
          unit_system: bodyDraft.unit,
        });
      } else if (sheet === 'gender') {
        await saveAndRefreshConfig({ ...config, gender: genderDraft });
      } else {
        await saveAndRefreshConfig({ ...config, activity_factor: activityDraft });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSheet(null);
    } catch (e: unknown) {
      // 抽屉保持打开，错误内联展示在 Save 按钮上方
      setSheetError(tError(e));
    } finally {
      setSaving(false);
    }
  }

  async function changeUnit(next: UnitSystem) {
    if (!config || next === config.unit_system) return;
    try {
      await saveAndRefreshConfig({ ...config, unit_system: next });
    } catch (e: unknown) {
      showToast(tError(e));
    }
  }

  function handleExport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAction('export');
  }

  function handleImport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAction('import');
  }

  function handleReset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAction('reset-scope');
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 分区一：设置与目标 */}
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
          {t('settings.section.profileTargets')}
        </Text>

        <SummaryCard
          accent={macroColors.calorie}
          index="1"
          title={t('settings.card.goal')}
          onEdit={() => openSheet('goal')}
        >
          <Text style={styles.summary} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {goalLabel} •{' '}
            {target ? (
              <AnimatedNumber
                value={target.daily_calorie}
                format={(v) => formatNumber(Math.round(v))}
              />
            ) : null}{' '}
            kcal
          </Text>
        </SummaryCard>

        <SummaryCard
          accent={macroColors.protein}
          index="2"
          title={t('settings.card.bodyMetrics')}
          onEdit={() => openSheet('body')}
        >
          <Text style={styles.summary} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {bodySummary}
          </Text>
        </SummaryCard>

        <SummaryCard
          accent={macroColors.fat}
          index="3"
          title={t('settings.card.biologicalSex')}
          onEdit={() => openSheet('gender')}
        >
          <Text style={styles.summary} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {genderSummary}
          </Text>
        </SummaryCard>

        <SummaryCard
          accent={macroColors.carb}
          index="4"
          title={t('settings.card.activityLevel')}
          onEdit={() => openSheet('activity')}
        >
          <Text style={styles.summary} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {activitySummary}
          </Text>
        </SummaryCard>

        {/* 分区二：偏好与数据 */}
        <Text style={[styles.sectionTitle, styles.sectionGap]} maxFontSizeMultiplier={1.4}>
          {t('settings.section.preferencesData')}
        </Text>

        <View style={[styles.prefsCard, cardShadow]}>
          <View style={styles.prefRow}>
            <View style={styles.prefBody}>
              <Text style={styles.prefTitle} maxFontSizeMultiplier={1.4}>
                {t('settings.unit')}
              </Text>
            </View>
            <View style={styles.unitSeg}>
              <SegmentedControl<UnitSystem>
                options={[
                  { label: t('unit.metric'), value: 'metric' },
                  { label: t('unit.us'), value: 'us' },
                ]}
                value={config?.unit_system ?? 'metric'}
                onChange={changeUnit}
              />
            </View>
          </View>

          <PrefsRow
            icon="share-outline"
            title={t('settings.export')}
            sub={t('settings.exportSub')}
            onPress={handleExport}
          />
          <PrefsRow
            icon="download-outline"
            title={t('settings.import')}
            sub={t('settings.importSub')}
            onPress={handleImport}
          />
          <PrefsRow
            icon="trash-outline"
            title={t('settings.reset')}
            sub={t('settings.resetSub')}
            danger
            onPress={handleReset}
          />
        </View>

        {/* 医疗免责声明（海外合规要求） */}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.4}>
          {t('profile.disclaimer')}
        </Text>
      </ScrollView>

      {/* 单步编辑抽屉：复用引导对应步骤组件 */}
      <EditSheet
        visible={sheet === 'goal'}
        title={t(SHEET_TITLES[sheet ?? 'goal'])}
        hint={t(SHEET_HINTS[sheet ?? 'goal'])}
        saving={saving}
        error={sheetError}
        onClose={() => setSheet(null)}
        onSave={saveSheet}
      >
        {sheet === 'goal' ? (
          <GoalPresetCards value={goalDraft} onChange={setGoalDraft} />
        ) : null}
      </EditSheet>

      <EditSheet
        visible={sheet === 'body'}
        title={t(SHEET_TITLES[sheet ?? 'goal'])}
        hint={t(SHEET_HINTS[sheet ?? 'goal'])}
        saving={saving}
        error={sheetError}
        onClose={() => setSheet(null)}
        onSave={saveSheet}
      >
        {sheet === 'body' ? (
          <BodyMetricsRulers
            age={bodyDraft.age}
            heightCm={bodyDraft.heightCm}
            weightKg={bodyDraft.weightKg}
            unit={bodyDraft.unit}
            onAge={(v) => setBodyDraft((d) => ({ ...d, age: v }))}
            onHeightCm={(v) => setBodyDraft((d) => ({ ...d, heightCm: v }))}
            onWeightKg={(v) => setBodyDraft((d) => ({ ...d, weightKg: v }))}
            onUnit={(u) => setBodyDraft((d) => ({ ...d, unit: u }))}
          />
        ) : null}
      </EditSheet>

      <EditSheet
        visible={sheet === 'gender'}
        title={t(SHEET_TITLES[sheet ?? 'goal'])}
        hint={t(SHEET_HINTS[sheet ?? 'goal'])}
        saving={saving}
        error={sheetError}
        onClose={() => setSheet(null)}
        onSave={saveSheet}
      >
        {sheet === 'gender' ? (
          <GenderOptionCards value={genderDraft} onChange={setGenderDraft} />
        ) : null}
      </EditSheet>

      <EditSheet
        visible={sheet === 'activity'}
        title={t(SHEET_TITLES[sheet ?? 'goal'])}
        hint={t(SHEET_HINTS[sheet ?? 'goal'])}
        saving={saving}
        error={sheetError}
        onClose={() => setSheet(null)}
        onSave={saveSheet}
      >
        {sheet === 'activity' ? (
          <ActivityLevelRows value={activityDraft} onChange={setActivityDraft} />
        ) : null}
      </EditSheet>

      {/* PREFERENCES & DATA 操作抽屉：导出格式选择 / 导入确认 / 清空确认 */}
      {action === 'export' ? (
        <ActionSheet
          visible
          title={t('settings.exportFormatTitle')}
          options={[
            {
              key: 'json',
              label: t('settings.exportJson'),
              sub: t('settings.exportJsonSub'),
              icon: 'archive-outline',
              tint: colors.accent,
            },
            {
              key: 'csv',
              label: t('settings.exportCsv'),
              sub: t('settings.exportCsvSub'),
              icon: 'document-text-outline',
              tint: macroColors.steps,
            },
          ]}
          onSelect={(key) =>
            void runIo(key === 'json' ? exportBackupFile : exportIntakeCsvFile)
          }
          onClose={() => setAction(null)}
        />
      ) : null}
      {action === 'import' ? (
        <ActionSheet
          visible
          title={t('settings.importConfirmTitle')}
          message={t('settings.importConfirmMsg')}
          confirmLabel={t('settings.importAction')}
          onConfirm={() =>
            void runIo(async () => {
              const restored = await restoreFromBackup();
              if (!restored) return; // 用户取消选择文件
              await refresh();
              showToast(t('settings.imported'));
            })
          }
          onClose={() => setAction(null)}
        />
      ) : null}
      {action === 'reset-scope' ? (
        <ActionSheet
          visible
          title={t('settings.resetScopeTitle')}
          options={[
            {
              key: 'intake',
              label: t('settings.resetIntake'),
              sub: t('settings.resetIntakeSub'),
              icon: 'restaurant-outline',
              tint: macroColors.calorie,
            },
            {
              key: 'all',
              label: t('settings.resetAll'),
              sub: t('settings.resetAllSub'),
              icon: 'trash-outline',
              tint: colors.danger,
            },
          ]}
          onSelect={(key) => setAction(key === 'intake' ? 'reset-intake' : 'reset-all')}
          onClose={() => setAction(null)}
        />
      ) : null}
      {action === 'reset-intake' ? (
        <ActionSheet
          visible
          title={t('settings.resetIntakeConfirmTitle')}
          message={t('settings.resetIntakeConfirmMsg')}
          confirmLabel={t('settings.resetIntakeAction')}
          confirmDanger
          onConfirm={() =>
            void runIo(async () => {
              await clearIntakeData();
              await refresh();
            })
          }
          onClose={() => setAction(null)}
        />
      ) : null}
      {action === 'reset-all' ? (
        <ActionSheet
          visible
          title={t('settings.resetConfirmTitle')}
          message={t('settings.resetConfirmMsg')}
          confirmLabel={t('settings.resetAction')}
          confirmDanger
          onConfirm={() =>
            void runIo(async () => {
              await resetEverything();
              await refresh();
            })
          }
          onClose={() => setAction(null)}
        />
      ) : null}

      {/* 轻提示（导出/导入/清空等非阻塞反馈） */}
      <Toast message={toast} opacity={toastOpacity} />
    </SafeAreaView>
  );
}

// Soft Card 摘要卡：4px 语义色条 + 编号 + 标题 + Edit
function SummaryCard({
  accent,
  index,
  title,
  onEdit,
  children,
}: {
  accent: string;
  index: string;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.summaryCard, cardShadow]}>
      <View style={[styles.cardBar, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardIndex, { color: accent }]} maxFontSizeMultiplier={1.4}>
            {index}
          </Text>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {title}
          </Text>
          <Pressable
            style={styles.editBtn}
            hitSlop={8}
            onPress={onEdit}
          >
            <Text style={styles.editText} maxFontSizeMultiplier={1.4}>
              {t('settings.edit')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}

// 偏好行：图标 + 标题/副标题 + 右侧箭头
function PrefsRow({
  icon,
  title,
  sub,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable style={({ pressed }) => [styles.prefRow, pressed && { opacity: 0.6 }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.prefBody}>
        <Text style={[styles.prefTitle, { color }]} maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        <Text style={styles.prefSub} maxFontSizeMultiplier={1.4}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIndex: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  summary: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  prefsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  prefBody: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  prefTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  prefSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  unitSeg: {
    width: 210,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
