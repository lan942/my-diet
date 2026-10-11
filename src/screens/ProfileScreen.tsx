// 「我的」页：每日目标（TDEE）、基础信息（含体重）、营养配比

import React, { useEffect, useState } from 'react';
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
import {
  computeTarget,
  ACTIVITY_LEVELS,
  GOAL_PRESETS,
} from '../services/targetService';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../services/unit';
import type { AppConfig, Gender, UnitSystem } from '../types';

const GENDER_LABELS: Record<Gender, string> = {
  male: '男',
  female: '女',
  unknown: '保密',
};

export default function ProfileScreen() {
  const { config, saveAndRefreshConfig } = useApp();

  // 基础信息（点击保存统一提交）
  const [gender, setGender] = useState<Gender>('unknown');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityFactor, setActivityFactor] = useState(1.2);
  // 单位偏好（美制下身高 ft+in 双字段、体重 lb）
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLb, setWeightLb] = useState('');

  // 营养配比
  const [carbRatio, setCarbRatio] = useState('');
  const [proteinRatio, setProteinRatio] = useState('');
  const [fatRatio, setFatRatio] = useState('');

  useEffect(() => {
    if (config) {
      setGender(config.gender);
      setAge(String(config.age));
      setHeightCm(String(config.height_cm));
      setWeightKg(String(config.weight_kg));
      setActivityFactor(config.activity_factor);
      setCarbRatio(String(config.carb_ratio));
      setProteinRatio(String(config.protein_ratio));
      setFatRatio(String(config.fat_ratio));
      setUnitSystem(config.unit_system);
      if (config.unit_system === 'us') {
        const { ft, in: inch } = cmToFtIn(config.height_cm);
        setHeightFt(String(ft));
        setHeightIn(String(inch));
        setWeightLb(String(kgToLb(config.weight_kg)));
      }
    }
  }, [config]);

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
      Alert.alert('保存成功', tip);
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
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
      Alert.alert('保存成功', '基础信息与营养配比已更新，其他页面数据已联动刷新');
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
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
          <Text style={styles.cardTitle}>每日目标（估算）</Text>
          {target ? (
            <>
              <View style={styles.targetRow}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue}>{target.daily_calorie.toFixed(0)}</Text>
                  <Text style={styles.targetUnit}>kcal (TDEE)</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue}>{target.protein_g.toFixed(0)}</Text>
                  <Text style={styles.targetUnit}>g 蛋白质</Text>
                </View>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroItem}>碳水 {target.carb_g.toFixed(1)}g</Text>
                <Text style={styles.macroItem}>蛋白 {target.protein_g.toFixed(1)}g</Text>
                <Text style={styles.macroItem}>脂肪 {target.fat_g.toFixed(1)}g</Text>
              </View>
              <Text style={styles.note}>
                TDEE = BMR × 活动系数（Mifflin-St Jeor），基于档案体重与基础信息估算
              </Text>
            </>
          ) : null}
        </Card>

        {/* 基础信息 */}
        <Card>
          <Text style={styles.cardTitle}>基础信息</Text>
          <View style={styles.genderRow}>
            {(['male', 'female', 'unknown'] as Gender[]).map((g) => {
              const active = gender === g;
              return (
                <Pressable
                  key={g}
                  style={[styles.genderChip, active && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, active && styles.chipTextActive]}>
                    {GENDER_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="年龄（岁）"
            value={age}
            onChangeText={setAge}
            placeholder="例如 30"
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>单位</Text>
          <View style={styles.unitSegWrap}>
            <SegmentedControl<UnitSystem>
              options={[
                { label: '公制 cm / kg', value: 'metric' },
                { label: '美制 ft / lb', value: 'us' },
              ]}
              value={unitSystem}
              onChange={switchUnit}
            />
          </View>
          {unitSystem === 'metric' ? (
            <>
              <TextField
                label="身高（cm）"
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="例如 170"
                keyboardType="numeric"
              />
              <TextField
                label="体重（kg）"
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="例如 70.5"
                keyboardType="numeric"
              />
            </>
          ) : (
            <>
              <View style={styles.usHeightRow}>
                <View style={styles.usHeightField}>
                  <TextField
                    label="身高（英尺 ft）"
                    value={heightFt}
                    onChangeText={setHeightFt}
                    placeholder="例如 5"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.usHeightField}>
                  <TextField
                    label="身高（英寸 in）"
                    value={heightIn}
                    onChangeText={setHeightIn}
                    placeholder="例如 7"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TextField
                label="体重（磅 lb）"
                value={weightLb}
                onChangeText={setWeightLb}
                placeholder="例如 154.3"
                keyboardType="numeric"
              />
            </>
          )}
          <Text style={styles.fieldLabel}>活动量</Text>
          {ACTIVITY_LEVELS.map((level) => {
            const active = Math.abs(activityFactor - level.factor) < 0.001;
            return (
              <Pressable
                key={level.factor}
                style={[styles.levelRow, active && styles.levelRowActive]}
                onPress={() => setActivityFactor(level.factor)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelLabel, active && styles.levelLabelActive]}>
                    {level.label}（×{level.factor}）
                  </Text>
                  <Text style={styles.levelDesc}>{level.desc}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
          <Text style={styles.note}>
            BMR：男 10×体重 + 6.25×身高 − 5×年龄 + 5；女末项 −161；未选性别 −78
          </Text>
        </Card>

        {/* 营养配比 */}
        <Card>
          <Text style={styles.cardTitle}>营养配比（总和必须等于 1）</Text>
          <Text style={styles.presetLabel}>快速预设</Text>
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
                      `已应用「${p.label}」预设`
                    );
                  }}
                >
                  <Text style={[styles.presetLabelText, isActive && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.presetDescText, isActive && styles.presetDescActive]}>
                    {p.desc}
                  </Text>
                  <Text style={[styles.presetRatioText, isActive && styles.chipTextActive]}>
                    蛋{Math.round(p.protein * 100)}/脂{Math.round(p.fat * 100)}/碳
                    {Math.round(p.carb * 100)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.divider}>— 或手动调整 —</Text>
          <TextField
            label="碳水比例"
            value={carbRatio}
            onChangeText={setCarbRatio}
            keyboardType="numeric"
          />
          <TextField
            label="蛋白质比例"
            value={proteinRatio}
            onChangeText={setProteinRatio}
            keyboardType="numeric"
          />
          <TextField
            label="脂肪比例"
            value={fatRatio}
            onChangeText={setFatRatio}
            keyboardType="numeric"
          />
          <Text
            style={[
              styles.ratioHint,
              Math.abs(ratioSum - 1) > 0.01 && styles.ratioHintError,
            ]}
          >
            当前比例总和：{ratioSum.toFixed(3)}
          </Text>
          <Text style={styles.note}>
            碳水 g = TDEE × 碳水比例 ÷ 4{'\n'}
            蛋白 g = TDEE × 蛋白比例 ÷ 4{'\n'}
            脂肪 g = TDEE × 脂肪比例 ÷ 9
          </Text>
        </Card>

        <Button title="保存基础信息与配比" onPress={handleSave} />
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
});
