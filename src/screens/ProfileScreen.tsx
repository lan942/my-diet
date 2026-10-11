// 「我的」页：每日目标（TDEE）、基础信息（含体重）、营养配比、免责声明

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField } from '../components/ui';
import SegmentedControl from '../components/SegmentedControl';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { t, tError } from '../i18n';
import {
  computeTarget,
  ACTIVITY_LEVELS,
  GOAL_PRESETS,
} from '../services/targetService';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../services/unit';
import type { AppConfig, Gender, UnitSystem } from '../types';

const GENDER_KEYS = {
  male: 'gender.male',
  female: 'gender.female',
  unknown: 'gender.unknown',
} as const;

export default function ProfileScreen() {
  const { config, saveAndRefreshConfig } = useApp();

  // 基础信息（点击保存统一提交；初值由 config 派生，App 在 config 就绪后才渲染本页）
  const [gender, setGender] = useState<Gender>(config?.gender ?? 'unknown');
  const [age, setAge] = useState(() => String(config?.age ?? 30));
  const [heightCm, setHeightCm] = useState(() => String(config?.height_cm ?? 170));
  const [weightKg, setWeightKg] = useState(() => String(config?.weight_kg ?? 70));
  const [activityFactor, setActivityFactor] = useState(config?.activity_factor ?? 1.2);
  // 单位偏好（美制下身高 ft+in 双字段、体重 lb）
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(config?.unit_system ?? 'metric');
  const [heightFt, setHeightFt] = useState(() => {
    if (config?.unit_system === 'us') return String(cmToFtIn(config.height_cm).ft);
    return '';
  });
  const [heightIn, setHeightIn] = useState(() => {
    if (config?.unit_system === 'us') return String(cmToFtIn(config.height_cm).in);
    return '';
  });
  const [weightLb, setWeightLb] = useState(() => {
    if (config?.unit_system === 'us') return String(Math.round(kgToLb(config.weight_kg)));
    return '';
  });

  // 营养配比
  const [carbRatio, setCarbRatio] = useState(() => String(config?.carb_ratio ?? 0.45));
  const [proteinRatio, setProteinRatio] = useState(() => String(config?.protein_ratio ?? 0.3));
  const [fatRatio, setFatRatio] = useState(() => String(config?.fat_ratio ?? 0.25));

  // 切换单位：双向换算当前已填数值
  function switchUnit(next: UnitSystem) {
    if (next === unitSystem) return;
    if (next === 'us') {
      const { ft, in: inch } = cmToFtIn(Number(heightCm) || 0);
      setHeightFt(String(ft));
      setHeightIn(String(inch));
      setWeightLb(String(kgToLb(Number(weightKg) || 0)));
    } else {
      setHeightCm(String(ftInToCm(Number(heightFt) || 0, Number(heightIn) || 0)));
      setWeightKg(String(lbToKg(Number(weightLb) || 0)));
    }
    setUnitSystem(next);
  }

  // 目标直接由档案计算（体重来自基础信息）
  const target = config ? computeTarget(config) : null;

  async function saveConfigPatch(patch: Partial<AppConfig>, tip: string) {
    if (!config) return;
    try {
      await saveAndRefreshConfig({ ...config, ...patch });
      Alert.alert(t('profile.saved'), tip);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), tError(e));
    }
  }

  async function handleSave() {
    if (!config) return;
    const cfg: AppConfig = {
      gender,
      age: Number(age),
      height_cm:
        unitSystem === 'us'
          ? ftInToCm(Number(heightFt), Number(heightIn))
          : Number(heightCm),
      weight_kg: unitSystem === 'us' ? lbToKg(Number(weightLb)) : Number(weightKg),
      activity_factor: activityFactor,
      carb_ratio: Number(carbRatio),
      protein_ratio: Number(proteinRatio),
      fat_ratio: Number(fatRatio),
      onboarded: config.onboarded,
      unit_system: unitSystem,
    };
    try {
      await saveAndRefreshConfig(cfg);
      Alert.alert(t('profile.saved'), t('profile.savedDetail'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), tError(e));
    }
  }

  const ratioSum = Number(carbRatio) + Number(proteinRatio) + Number(fatRatio);

  function ratioApproxEqual(a: number, b: number) {
    return Math.abs(a - b) < 0.001;
  }

  const activePreset = GOAL_PRESETS.find(
    (p) =>
      ratioApproxEqual(p.carb, Number(carbRatio)) &&
      ratioApproxEqual(p.protein, Number(proteinRatio)) &&
      ratioApproxEqual(p.fat, Number(fatRatio))
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 每日目标（TDEE 估算） */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('profile.dailyTarget')}
          </Text>
          {target ? (
            <>
              <View style={styles.targetRow}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue} maxFontSizeMultiplier={2}>
                    {target.daily_calorie.toFixed(0)}
                  </Text>
                  <Text style={styles.targetUnit} maxFontSizeMultiplier={1.4}>
                    kcal (TDEE)
                  </Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue} maxFontSizeMultiplier={2}>
                    {target.protein_g.toFixed(0)}
                  </Text>
                  <Text style={styles.targetUnit} maxFontSizeMultiplier={1.4}>
                    {t('macro.proteinUnit')}
                  </Text>
                </View>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroItem} maxFontSizeMultiplier={1.4}>
                  {t('macro.carb')} {target.carb_g.toFixed(1)}g
                </Text>
                <Text style={styles.macroItem} maxFontSizeMultiplier={1.4}>
                  {t('macro.protein')} {target.protein_g.toFixed(1)}g
                </Text>
                <Text style={styles.macroItem} maxFontSizeMultiplier={1.4}>
                  {t('macro.fat')} {target.fat_g.toFixed(1)}g
                </Text>
              </View>
              <Text style={styles.note} maxFontSizeMultiplier={1.4}>
                {t('profile.tdeeNote')}
              </Text>
            </>
          ) : null}
        </Card>

        {/* 基础信息 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('profile.basicInfo')}
          </Text>
          <View style={styles.genderRow}>
            {(['male', 'female', 'unknown'] as Gender[]).map((g) => {
              const active = gender === g;
              return (
                <Pressable
                  key={g}
                  style={[styles.genderChip, active && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, active && styles.chipTextActive]} maxFontSizeMultiplier={1.4}>
                    {t(GENDER_KEYS[g])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label={t('profile.age')}
            value={age}
            onChangeText={setAge}
            placeholder={t('profile.agePh')}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.4}>
            {t('profile.unitLabel')}
          </Text>
          <View style={styles.unitSegWrap}>
            <SegmentedControl<UnitSystem>
              options={[
                { label: t('unit.metric'), value: 'metric' },
                { label: t('unit.us'), value: 'us' },
              ]}
              value={unitSystem}
              onChange={switchUnit}
            />
          </View>
          {unitSystem === 'metric' ? (
            <>
              <TextField
                label={t('profile.heightCm')}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder={t('profile.heightCmPh')}
                keyboardType="numeric"
              />
              <TextField
                label={t('profile.weightKg')}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder={t('profile.weightKgPh')}
                keyboardType="numeric"
              />
            </>
          ) : (
            <>
              <View style={styles.usHeightRow}>
                <View style={styles.usHeightField}>
                  <TextField
                    label={t('profile.heightFt')}
                    value={heightFt}
                    onChangeText={setHeightFt}
                    placeholder={t('profile.heightFtPh')}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.usHeightField}>
                  <TextField
                    label={t('profile.heightIn')}
                    value={heightIn}
                    onChangeText={setHeightIn}
                    placeholder={t('profile.heightInPh')}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TextField
                label={t('profile.weightLb')}
                value={weightLb}
                onChangeText={setWeightLb}
                placeholder={t('profile.weightLbPh')}
                keyboardType="numeric"
              />
            </>
          )}
          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.4}>
            {t('profile.activity')}
          </Text>
          {ACTIVITY_LEVELS.map((level) => {
            const active = Math.abs(activityFactor - level.factor) < 0.001;
            return (
              <Pressable
                key={level.factor}
                style={[styles.levelRow, active && styles.levelRowActive]}
                onPress={() => setActivityFactor(level.factor)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelLabel, active && styles.levelLabelActive]} maxFontSizeMultiplier={1.4}>
                    {t(level.label)}（×{level.factor}）
                  </Text>
                  <Text style={styles.levelDesc} maxFontSizeMultiplier={1.4}>
                    {t(level.desc)}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
          <Text style={styles.note} maxFontSizeMultiplier={1.4}>
            {t('profile.bmrNote')}
          </Text>
        </Card>

        {/* 营养配比 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('profile.ratioTitle')}
          </Text>
          <Text style={styles.presetLabel} maxFontSizeMultiplier={1.4}>
            {t('profile.quickPresets')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {GOAL_PRESETS.map((p) => {
              const isActive = activePreset?.label === p.label;
              return (
                <Pressable
                  key={p.label}
                  style={[styles.presetChip, isActive && styles.chipActive]}
                  onPress={() => {
                    setCarbRatio(String(p.carb));
                    setProteinRatio(String(p.protein));
                    setFatRatio(String(p.fat));
                    // 立即保存并刷新全局 config，让其他 Tab 联动更新
                    saveConfigPatch(
                      { carb_ratio: p.carb, protein_ratio: p.protein, fat_ratio: p.fat },
                      t('profile.presetApplied', { label: t(p.label) })
                    );
                  }}
                >
                  <Text style={[styles.presetLabelText, isActive && styles.chipTextActive]} maxFontSizeMultiplier={1.4}>
                    {t(p.label)}
                  </Text>
                  <Text style={[styles.presetDescText, isActive && styles.presetDescActive]} maxFontSizeMultiplier={1.4}>
                    {t(p.desc)}
                  </Text>
                  <Text style={[styles.presetRatioText, isActive && styles.chipTextActive]} maxFontSizeMultiplier={1.4}>
                    {t('profile.presetRatio', {
                      p: Math.round(p.protein * 100),
                      f: Math.round(p.fat * 100),
                      c: Math.round(p.carb * 100),
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.divider} maxFontSizeMultiplier={1.4}>
            {t('profile.orManually')}
          </Text>
          <TextField
            label={t('profile.carbRatio')}
            value={carbRatio}
            onChangeText={setCarbRatio}
            keyboardType="numeric"
          />
          <TextField
            label={t('profile.proteinRatio')}
            value={proteinRatio}
            onChangeText={setProteinRatio}
            keyboardType="numeric"
          />
          <TextField
            label={t('profile.fatRatio')}
            value={fatRatio}
            onChangeText={setFatRatio}
            keyboardType="numeric"
          />
          <Text
            style={[
              styles.ratioHint,
              Math.abs(ratioSum - 1) > 0.01 && styles.ratioHintError,
            ]}
            maxFontSizeMultiplier={1.4}
          >
            {t('profile.ratioSum', { sum: ratioSum.toFixed(3) })}
          </Text>
          <Text style={styles.note} maxFontSizeMultiplier={1.4}>
            {t('profile.formulaNote')}
          </Text>
        </Card>

        <Button title={t('profile.saveAll')} onPress={handleSave} />

        {/* 医疗免责声明（海外合规要求） */}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.4}>
          {t('profile.disclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  targetUnit: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  macroItem: {
    fontSize: 13,
    color: colors.text,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  unitSegWrap: {
    marginBottom: spacing.md,
  },
  usHeightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  usHeightField: {
    flex: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    marginBottom: spacing.xs,
  },
  levelRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  levelLabelActive: {
    color: colors.accent,
  },
  levelDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  presetLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  presetRow: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.sm,
    minWidth: 100,
  },
  presetLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  presetDescText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  presetDescActive: {
    color: '#e0e7ff',
  },
  presetRatioText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  ratioHint: {
    fontSize: 13,
    color: colors.ok,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  ratioHintError: {
    color: colors.danger,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
