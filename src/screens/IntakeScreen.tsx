// 今日：选食物录克数与餐次、当日汇总、达成率、按日切换、删除记录

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField, Row, EmptyState } from '../components/ui';
import Toast, { useToast } from '../components/Toast';
import DateBar from '../components/DateBar';
import ProgressBar from '../components/ProgressBar';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { t, tError, type TranslationKey } from '../i18n';
import { createIntake, deleteIntake, summarizeDaily } from '../services/intakeService';
import { computeTarget } from '../services/targetService';
import { foodDisplayName, isLowGI } from '../services/foodService';
import type { DailyNutrition, TargetResult } from '../types';

// 餐次：存储值固定为英文枚举（新数据 locale 无关）；旧数据中的中文值经映射兼容显示
const MEALS: { value: string; key: TranslationKey }[] = [
  { value: 'breakfast', key: 'meal.breakfast' },
  { value: 'lunch', key: 'meal.lunch' },
  { value: 'dinner', key: 'meal.dinner' },
  { value: 'snack', key: 'meal.snack' },
];

const LEGACY_MEAL_VALUES: Record<string, string> = {
  早餐: 'breakfast',
  午餐: 'lunch',
  晚餐: 'dinner',
  加餐: 'snack',
};

function mealDisplayKey(value: string): TranslationKey {
  const canonical = LEGACY_MEAL_VALUES[value] ?? value;
  return (MEALS.find((m) => m.value === canonical)?.key ?? 'meal.lunch') as TranslationKey;
}

export default function IntakeScreen() {
  const {
    config,
    foodItems,
    intakeLogs,
    currentDate,
    setCurrentDate,
    refresh,
  } = useApp();
  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null);
  const [grams, setGrams] = useState('');
  const [meal, setMeal] = useState('lunch');
  const [summary, setSummary] = useState<DailyNutrition>({
    total_kcal: 0,
    total_protein: 0,
    total_carb: 0,
    total_fat: 0,
  });
  // 目标由 config 纯派生（不进 effect，避免级联渲染）
  const target = useMemo<TargetResult | null>(
    () => (config ? computeTarget(config) : null),
    [config]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [formError, setFormError] = useState('');
  const { toast, toastOpacity, showToast } = useToast();

  useEffect(() => {
    summarizeDaily(currentDate).then(setSummary).catch(() => {});
  }, [currentDate, intakeLogs]);

  const logsWithNames = useMemo(() => {
    const map = new Map(foodItems.map((f) => [f.id, f]));
    return intakeLogs.map((l) => ({
      ...l,
      food: map.get(l.food_item_id),
    }));
  }, [intakeLogs, foodItems]);

  async function handleAdd() {
    setFormError('');
    if (!selectedFoodId) {
      setFormError(t('intake.selectFood'));
      return;
    }
    const g = Number(grams);
    if (!isFinite(g) || g <= 0) {
      setFormError(t('error.ERR_INVALID_GRAMS'));
      return;
    }
    try {
      await createIntake({
        date: currentDate,
        food_item_id: selectedFoodId,
        grams: g,
        meal,
      });
      setGrams('');
      await refresh();
    } catch (e: unknown) {
      setFormError(tError(e));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteIntake(id);
      await refresh();
    } catch {
      showToast(t('common.deleteFailed'));
    }
  }

  const selectedFood = foodItems.find((f) => f.id === selectedFoodId);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateBar date={currentDate} onChange={setCurrentDate} />

        {/* 达成率 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('intake.dailyProgress')}
          </Text>
          {target ? (
            <>
              <ProgressBar
                label={t('macro.calorie')}
                current={summary.total_kcal}
                target={target.daily_calorie}
                unit="kcal"
              />
              <ProgressBar
                label={t('macro.protein')}
                current={summary.total_protein}
                target={target.protein_g}
                unit="g"
              />
              <ProgressBar
                label={t('macro.carb')}
                current={summary.total_carb}
                target={target.carb_g}
                unit="g"
              />
              <ProgressBar
                label={t('macro.fat')}
                current={summary.total_fat}
                target={target.fat_g}
                unit="g"
              />
            </>
          ) : (
            <Text style={styles.emptyHint} maxFontSizeMultiplier={1.4}>
              {t('intake.emptyTarget')}
            </Text>
          )}
        </Card>

        {/* 新增摄入 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('intake.recordTitle')}
          </Text>
          <Pressable
            onPress={() => setShowPicker((v) => !v)}
            style={styles.foodSelector}
          >
            <Text style={selectedFood ? styles.foodSelected : styles.foodPlaceholder} maxFontSizeMultiplier={1.4}>
              {selectedFood
                ? `${foodDisplayName(selectedFood)}${selectedFood.gi !== null && isLowGI(selectedFood.gi) ? ` · ${t('common.lowGi')}` : ''}`
                : t('intake.selectFood')}
            </Text>
            <Ionicons
              name={showPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {showPicker && (
            <ScrollView style={styles.picker} nestedScrollEnabled>
              {foodItems.map((f) => (
                <Pressable
                  key={f.id}
                  style={[
                    styles.pickerItem,
                    selectedFoodId === f.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedFoodId(f.id);
                    setShowPicker(false);
                    setFormError('');
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedFoodId === f.id && styles.pickerItemTextActive,
                    ]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {foodDisplayName(f)}
                  </Text>
                  {f.gi !== null && isLowGI(f.gi) && (
                    <Text style={styles.lowGiTag} maxFontSizeMultiplier={1.4}>
                      {t('common.lowGi')}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
          <TextField
            label={t('intake.grams')}
            value={grams}
            onChangeText={(v) => {
              setGrams(v);
              setFormError('');
            }}
            keyboardType="numeric"
            placeholder={t('intake.gramsPh')}
          />
          <View style={styles.mealRow}>
            {MEALS.map((m) => (
              <Pressable
                key={m.value}
                style={[styles.mealChip, meal === m.value && styles.mealChipActive]}
                onPress={() => setMeal(m.value)}
              >
                <Text style={[styles.mealText, meal === m.value && styles.mealTextActive]} maxFontSizeMultiplier={1.4}>
                  {t(m.key)}
                </Text>
              </Pressable>
            ))}
          </View>
          {formError ? (
            <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
              {formError}
            </Text>
          ) : null}
          <Button title={t('intake.add')} onPress={handleAdd} />
        </Card>

        {/* 当日摄入列表 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('intake.todayLog')}
          </Text>
          {logsWithNames.length === 0 ? (
            <EmptyState text={t('intake.emptyLog')} />
          ) : (
            logsWithNames.map((l) => {
              const factor = l.grams / 100;
              const kcal = (l.food?.kcal_per_100g ?? 0) * factor;
              return (
                <Row
                  key={l.id}
                  left={
                    <View>
                      <Text style={styles.logFood} maxFontSizeMultiplier={1.4}>
                        {l.food ? foodDisplayName(l.food) : t('intake.deletedFood')} · {l.grams.toFixed(0)}g
                      </Text>
                      <Text style={styles.logMeta} maxFontSizeMultiplier={1.4}>
                        {t(mealDisplayKey(l.meal))} · {kcal.toFixed(1)} kcal
                      </Text>
                    </View>
                  }
                  right={
                    <Pressable onPress={() => handleDelete(l.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  }
                />
              );
            })
          )}
        </Card>
      </ScrollView>

      {/* 轻提示（删除失败等非阻塞反馈） */}
      <Toast message={toast} opacity={toastOpacity} />
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
  emptyHint: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  foodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  foodSelected: {
    fontSize: 15,
    color: colors.text,
  },
  foodPlaceholder: {
    fontSize: 15,
    color: colors.muted,
  },
  picker: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerItemActive: {
    backgroundColor: '#eff6ff',
  },
  pickerItemText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerItemTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  lowGiTag: {
    fontSize: 11,
    color: colors.ok,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mealRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mealChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  mealText: {
    fontSize: 13,
    color: colors.text,
  },
  mealTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  logFood: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  logMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
