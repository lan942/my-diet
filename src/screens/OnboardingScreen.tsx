// 首次启动 4 步引导向导：目标 → 身体参数（公/美制）→ 性别（可选）→ 活动强度 → 完成弹窗

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import RulerPicker from '../components/RulerPicker';
import SegmentedControl from '../components/SegmentedControl';
import AnimatedNumber from '../components/AnimatedNumber';
import { Button } from '../components/ui';
import { colors, spacing, macroColors, cardShadow } from '../theme';
import { useApp } from '../state/AppContext';
import { t, tError, type TranslationKey } from '../i18n';
import {
  GOAL_PRESETS,
  ACTIVITY_LEVELS,
  computeBmr,
  computeTdee,
  type GoalPreset,
} from '../services/targetService';
import {
  kgToLb,
  lbToKg,
  ftInLabel,
  cmToInSnap,
  inToCm,
} from '../services/unit';
import type { Gender, UnitSystem } from '../types';

// 活动强度 5 档的渐进色：翡翠绿（低）→ 琥珀（中）→ 珊瑚红（高）
const LEVEL_COLORS = ['#10B981', '#10B981', '#F59E0B', '#F59E0B', '#FF6B4A'];

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

const GENDER_OPTIONS: { value: Gender; label: TranslationKey; icon: keyof typeof Ionicons.glyphMap; desc: TranslationKey; chipBg: string; iconColor: string }[] = [
  { value: 'male', label: 'gender.male', icon: 'man-outline', desc: 'onboarding.genderMaleDesc', chipBg: '#2563eb14', iconColor: '#2563eb' },
  { value: 'female', label: 'gender.female', icon: 'woman-outline', desc: 'onboarding.genderFemaleDesc', chipBg: '#EC489914', iconColor: '#EC4899' },
  { value: 'unknown', label: 'gender.unknown', icon: 'help-circle-outline', desc: 'onboarding.genderUnknownDesc', chipBg: '#6b728014', iconColor: '#6b7280' },
];

export default function OnboardingScreen() {
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

  // 完成弹窗预览目标（基于当前草稿）
  const preview = useMemo(() => {
    if (!goal) return null;
    const tdee = computeTdee(computeBmr(gender, weightKg, heightCm, age), activityFactor);
    return {
      tdee,
      protein: (tdee * goal.protein) / 4,
      fat: (tdee * goal.fat) / 9,
      carb: (tdee * goal.carb) / 4,
    };
  }, [goal, gender, weightKg, heightCm, age, activityFactor]);

  const canNext = step === 1 ? goal !== null : true;

  function selectGoal(p: GoalPreset) {
    Haptics.selectionAsync().catch(() => {});
    setGoal(p);
  }

  async function handleConfirm() {
    if (!goal) return;
    setSaving(true);
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
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowDone(false);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), tError(e));
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
            {GOAL_PRESETS.map((p) => {
              const active = goal?.label === p.label;
              return (
                <Pressable
                  key={p.label}
                  style={[
                    styles.goalCard,
                    cardShadow,
                    active && { borderColor: p.color, backgroundColor: p.color },
                  ]}
                  onPress={() => selectGoal(p)}
                >
                  <View style={[styles.goalBar, { backgroundColor: active ? '#ffffff' : p.color }]} />
                  <View style={styles.goalBody}>
                    <Text style={[styles.goalLabel, active && styles.textOnColor]} maxFontSizeMultiplier={1.4}>
                      {t(p.label)}
                    </Text>
                    <Text style={[styles.goalDesc, active && styles.textOnColorSoft]} maxFontSizeMultiplier={1.4}>
                      {t(p.desc)}
                    </Text>
                    <View style={styles.ratioRow}>
                      <Text
                        style={[
                          styles.ratioText,
                          active ? styles.textOnColor : { color: macroColors.protein },
                        ]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {t('macro.protein')} {Math.round(p.protein * 100)}%
                      </Text>
                      <Text
                        style={[
                          styles.ratioText,
                          active ? styles.textOnColor : { color: macroColors.fat },
                        ]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {t('macro.fat')} {Math.round(p.fat * 100)}%
                      </Text>
                      <Text
                        style={[
                          styles.ratioText,
                          active ? styles.textOnColor : { color: macroColors.carb },
                        ]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {t('macro.carb')} {Math.round(p.carb * 100)}%
                      </Text>
                    </View>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <SegmentedControl<UnitSystem>
              options={[
                { label: t('unit.metric'), value: 'metric' },
                { label: t('unit.us'), value: 'us' },
              ]}
              value={unit}
              onChange={setUnit}
            />
            <View style={styles.rulerGroup}>
              <RulerPicker
                min={1}
                max={120}
                step={1}
                value={age}
                unit={t('unit.age')}
                icon="calendar-outline"
                onChange={setAge}
              />
              <RulerPicker
                min={unit === 'metric' ? 100 : 40}
                max={unit === 'metric' ? 250 : 98}
                step={unit === 'metric' ? 1 : 0.5}
                value={unit === 'metric' ? heightCm : cmToInSnap(heightCm)}
                unit={unit === 'metric' ? t('unit.cm') : t('unit.in')}
                icon="body-outline"
                onChange={(v) => setHeightCm(unit === 'metric' ? v : inToCm(v))}
                formatValue={(v) =>
                  unit === 'metric'
                    ? `${v}`
                    : t('unit.ftInFormat', { label: ftInLabel(v), inches: v.toFixed(1) })
                }
              />
              <RulerPicker
                min={unit === 'metric' ? 30 : 66}
                max={unit === 'metric' ? 200 : 440}
                step={unit === 'metric' ? 0.5 : 1}
                value={unit === 'metric' ? weightKg : Math.round(kgToLb(weightKg))}
                unit={unit === 'metric' ? t('unit.kg') : t('unit.lb')}
                icon="speedometer-outline"
                onChange={(v) => setWeightKg(unit === 'metric' ? v : lbToKg(v))}
              />
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            {GENDER_OPTIONS.map((o) => {
              const active = gender === o.value;
              return (
                <Pressable
                  key={o.value}
                  style={[styles.genderCard, active && styles.cardActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setGender(o.value);
                  }}
                >
                  <View style={[styles.genderChip, { backgroundColor: o.chipBg }]}>
                    <Ionicons name={o.icon} size={22} color={o.iconColor} />
                  </View>
                  <View style={styles.genderBody}>
                    <Text style={styles.genderLabel} maxFontSizeMultiplier={1.4}>
                      {t(o.label)}
                    </Text>
                    <Text style={styles.genderDesc} maxFontSizeMultiplier={1.4}>
                      {t(o.desc)}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
            <Text style={styles.note} maxFontSizeMultiplier={1.4}>
              {t('onboarding.genderNote')}
            </Text>
          </View>
        ) : null}

        {step === 4 ? (
          <View>
            {ACTIVITY_LEVELS.map((level, idx) => {
              const active = Math.abs(activityFactor - level.factor) < 0.001;
              const intensityColor = LEVEL_COLORS[idx] ?? colors.muted;
              return (
                <Pressable
                  key={level.factor}
                  style={[styles.levelRow, active && styles.cardActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActivityFactor(level.factor);
                  }}
                >
                  <View style={styles.levelBody}>
                    <View style={styles.levelTitleRow}>
                      <Text style={styles.levelLabel} maxFontSizeMultiplier={1.4}>
                        {t(level.label)} (×{level.factor})
                      </Text>
                      <View style={styles.dotsRow}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              { backgroundColor: i <= idx ? intensityColor : colors.line },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.levelDesc} maxFontSizeMultiplier={1.4}>
                      {t(level.desc)}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
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
            <Button title={t('onboarding.done')} onPress={() => setShowDone(true)} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    ...cardShadow,
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
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  goalBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  goalBody: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  goalDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  ratioRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  ratioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textOnColor: {
    color: '#ffffff',
  },
  textOnColorSoft: {
    color: 'rgba(255,255,255,0.85)',
  },
  rulerGroup: {
    marginTop: spacing.lg,
  },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: '#2563eb14',
  },
  genderChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  genderDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  levelBody: {
    flex: 1,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  levelDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
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
});
