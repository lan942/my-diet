// 首次启动 4 步引导向导：目标 → 身体参数（公/美制）→ 性别（可选）→ 活动强度 → 完成弹窗
// 4 步 UI 由 src/components/onboarding/ 受控组件承载（与「我的」编辑抽屉共用）

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import AnimatedNumber from '../components/AnimatedNumber';
import GoalPresetCards from '../components/onboarding/GoalPresetCards';
import BodyMetricsRulers from '../components/onboarding/BodyMetricsRulers';
import GenderOptionCards from '../components/onboarding/GenderOptionCards';
import ActivityLevelRows from '../components/onboarding/ActivityLevelRows';
import { Button } from '../components/ui';
import { spacing, macroColors, cardShadowLight, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../state/AppContext';
import { t, tError, type TranslationKey } from '../i18n';
import { computeTarget, type GoalPreset } from '../services/targetService';
import { DEFAULT_CONFIG } from '../services/configStore';
import type { Gender, UnitSystem } from '../types';

const STEP_TITLES: TranslationKey[] = [
  'onboarding.title.1',
  'onboarding.title.2',
  'onboarding.title.3',
  'onboarding.title.4',
];
const STEP_HINTS: TranslationKey[] = [
  'onboarding.hint.1',
  'onboarding.hint.2',
  'onboarding.hint.3',
  'onboarding.hint.4',
];

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { saveAndRefreshConfig } = useApp();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<GoalPreset | null>(null);
  const [unit, setUnit] = useState<UnitSystem>('metric');
  const [age, setAge] = useState(30);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [gender, setGender] = useState<Gender>('unknown');
  const [activityFactor, setActivityFactor] = useState(1.2);
  const [showDone, setShowDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // 完成弹窗预览目标：以草稿构造配置，统一走 computeTarget（禁止页面内重算 BMR/TDEE）
  const preview = useMemo(() => {
    if (!goal) return null;
    const target = computeTarget({
      ...DEFAULT_CONFIG,
      gender,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      activity_factor: activityFactor,
      protein_ratio: goal.protein,
      fat_ratio: goal.fat,
      carb_ratio: goal.carb,
      unit_system: unit,
    });
    return {
      tdee: target.daily_calorie,
      protein: target.protein_g,
      fat: target.fat_g,
      carb: target.carb_g,
    };
  }, [goal, gender, weightKg, heightCm, age, activityFactor, unit]);

  const canNext = step === 1 ? goal !== null : true;

  async function handleConfirm() {
    if (!goal) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveAndRefreshConfig({
        gender,
        age,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_factor: activityFactor,
        carb_ratio: goal.carb,
        protein_ratio: goal.protein,
        fat_ratio: goal.fat,
        onboarded: true,
        unit_system: unit,
        theme_preference: 'system',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowDone(false);
    } catch (e: unknown) {
      // 完成抽屉保持打开，错误内联展示在 Start 按钮上方
      setSaveError(tError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      {/* 顶部进度 */}
      <View style={styles.header}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegOn]} />
          ))}
        </View>
        <Text style={styles.progressText} maxFontSizeMultiplier={1.4}>
          {t('onboarding.stepOf', { step })}
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.4}>
          {t(STEP_TITLES[step - 1])}
        </Text>
        <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
          {t(STEP_HINTS[step - 1])}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View>
            <View style={styles.offlineBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
              <Text style={styles.offlineBadgeText} maxFontSizeMultiplier={1.4}>
                {t('onboarding.offlineBadge')}
              </Text>
            </View>
            <GoalPresetCards value={goal} onChange={setGoal} />
          </View>
        ) : null}

        {step === 2 ? (
          <BodyMetricsRulers
            age={age}
            heightCm={heightCm}
            weightKg={weightKg}
            unit={unit}
            onAge={setAge}
            onHeightCm={setHeightCm}
            onWeightKg={setWeightKg}
            onUnit={setUnit}
          />
        ) : null}

        {step === 3 ? (
          <View>
            <GenderOptionCards value={gender} onChange={setGender} />
            <Text style={styles.note} maxFontSizeMultiplier={1.4}>
              {t('onboarding.genderNote')}
            </Text>
          </View>
        ) : null}

        {step === 4 ? (
          <ActivityLevelRows value={activityFactor} onChange={setActivityFactor} />
        ) : null}
      </ScrollView>

      {/* 底部导航 */}
      <View style={styles.navRow}>
        <View style={styles.navSide}>
          {step > 1 ? (
            <Button title={t('onboarding.prev')} variant="ghost" onPress={() => setStep(step - 1)} />
          ) : null}
        </View>
        <View style={styles.navMain}>
          {step < 4 ? (
            <Button title={t('onboarding.next')} onPress={() => setStep(step + 1)} disabled={!canNext} />
          ) : (
            <Button
              title={t('onboarding.done')}
              onPress={() => {
                setSaveError('');
                setShowDone(true);
              }}
            />
          )}
        </View>
      </View>

      {/* 完成弹窗（Bottom Sheet 风格） */}
      <Modal
        visible={showDone}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDone(false)}
      >
        <View style={styles.sheetMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDone(false)} />
          <View style={[styles.sheet, { paddingBottom: spacing.xl + 16 + insets.bottom }]}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.4}>
              {t('onboarding.doneTitle')}
            </Text>
            <Text style={styles.sheetSubtitle} maxFontSizeMultiplier={1.4}>
              {goal ? t('onboarding.doneSubtitle', { goal: t(goal.label) }) : ''}
            </Text>
            {preview ? (
              <View style={styles.previewBox}>
                <AnimatedNumber
                  style={styles.previewKcal}
                  value={preview.tdee}
                  format={(v) => `${Math.round(v)}`}
                />
                <Text style={styles.previewUnit} maxFontSizeMultiplier={1.4}>
                  {t('onboarding.kcalPerDay')}
                </Text>
                <View style={styles.previewMacros}>
                  <Text
                    style={[styles.previewMacro, { color: macroColors.protein }]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {t('macro.protein')} {preview.protein.toFixed(0)}g
                  </Text>
                  <Text
                    style={[styles.previewMacro, { color: macroColors.fat }]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {t('macro.fat')} {preview.fat.toFixed(0)}g
                  </Text>
                  <Text
                    style={[styles.previewMacro, { color: macroColors.carb }]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {t('macro.carb')} {preview.carb.toFixed(0)}g
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.sheetHint} maxFontSizeMultiplier={1.4}>
              {t('onboarding.doneHint')}
            </Text>
            {saveError ? (
              <Text style={styles.sheetError} maxFontSizeMultiplier={1.4}>
                {saveError}
              </Text>
            ) : null}
            <Button
              title={saving ? t('onboarding.saving') : t('onboarding.start')}
              onPress={handleConfirm}
              disabled={saving}
            />
            <Pressable style={styles.sheetBack} onPress={() => setShowDone(false)}>
              <Text style={styles.sheetBackText} maxFontSizeMultiplier={1.4}>
                {t('onboarding.backToEdit')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    ...(isDark ? {} : cardShadowLight),
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  progressSegOn: {
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  offlineBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  note: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navSide: {
    flex: 1,
    justifyContent: 'center',
  },
  navMain: {
    flex: 1,
  },
  sheetMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 8,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  previewBox: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  previewKcal: {
    fontSize: 40,
    fontWeight: '800',
    color: macroColors.calorie,
  },
  previewUnit: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  previewMacros: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  previewMacro: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetHint: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetBack: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetBackText: {
    fontSize: 14,
    color: colors.muted,
  },
  sheetError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
