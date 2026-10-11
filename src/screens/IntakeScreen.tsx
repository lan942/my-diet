// 今日：选食物录克数与餐次、当日汇总、达成率、按日切换、删除记录

import React, { useEffect, useMemo, useState } from 'react';
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
import { Button, TextField, Row, EmptyState } from '../components/ui';
import DateBar from '../components/DateBar';
import ProgressBar from '../components/ProgressBar';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { createIntake, deleteIntake, summarizeDaily } from '../services/intakeService';
import { computeTarget } from '../services/targetService';
import { getLatestWeight } from '../services/weightService';
import { isLowGI } from '../services/foodService';
import type { DailyNutrition, TargetResult } from '../types';

const MEALS = ['早餐', '午餐', '晚餐', '加餐'];

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
  const [meal, setMeal] = useState('午餐');
  const [summary, setSummary] = useState<DailyNutrition>({
    total_kcal: 0,
    total_protein: 0,
    total_carb: 0,
    total_fat: 0,
  });
  const [target, setTarget] = useState<TargetResult | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    summarizeDaily(currentDate).then(setSummary).catch(() => {});
    if (config) {
      getLatestWeight()
        .then((w) => setTarget(computeTarget(w, config)))
        .catch(() => {});
    }
  }, [currentDate, intakeLogs, config]);

  const logsWithNames = useMemo(() => {
    const map = new Map(foodItems.map((f) => [f.id, f]));
    return intakeLogs.map((l) => ({
      ...l,
      food: map.get(l.food_item_id),
    }));
  }, [intakeLogs, foodItems]);

  async function handleAdd() {
    if (!selectedFoodId) return Alert.alert('错误', '请选择食物');
    const g = Number(grams);
    if (!isFinite(g) || g <= 0) return Alert.alert('错误', '克数必须为正数');
    try {
      await createIntake({
        date: currentDate,
        food_item_id: selectedFoodId,
        grams: g,
        meal,
      });
      setGrams('');
      await refresh();
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteIntake(id);
      await refresh();
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '删除失败');
    }
  }

  const selectedFood = foodItems.find((f) => f.id === selectedFoodId);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateBar date={currentDate} onChange={setCurrentDate} />

        {/* 达成率 */}
        <Card>
          <Text style={styles.cardTitle}>当日达成</Text>
          {target ? (
            <>
              <ProgressBar
                label="热量"
                current={summary.total_kcal}
                target={target.daily_calorie}
                unit="kcal"
              />
              <ProgressBar
                label="蛋白质"
                current={summary.total_protein}
                target={target.protein_g}
                unit="g"
              />
              <ProgressBar
                label="碳水"
                current={summary.total_carb}
                target={target.carb_g}
                unit="g"
              />
              <ProgressBar
                label="脂肪"
                current={summary.total_fat}
                target={target.fat_g}
                unit="g"
              />
            </>
          ) : (
            <Text style={styles.emptyHint}>请先在「体重」页录入体重</Text>
          )}
        </Card>

        {/* 新增摄入 */}
        <Card>
          <Text style={styles.cardTitle}>记录摄入</Text>
          <Pressable
            onPress={() => setShowPicker((v) => !v)}
            style={styles.foodSelector}
          >
            <Text style={selectedFood ? styles.foodSelected : styles.foodPlaceholder}>
              {selectedFood
                ? `${selectedFood.name}${selectedFood.gi !== null && isLowGI(selectedFood.gi) ? ' · 低GI' : ''}`
                : '选择食物…'}
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
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedFoodId === f.id && styles.pickerItemTextActive,
                    ]}
                  >
                    {f.name}
                  </Text>
                  {f.gi !== null && isLowGI(f.gi) && (
                    <Text style={styles.lowGiTag}>低GI</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
          <TextField
            label="克数（g）"
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            placeholder="例如 150"
          />
          <View style={styles.mealRow}>
            {MEALS.map((m) => (
              <Pressable
                key={m}
                style={[styles.mealChip, meal === m && styles.mealChipActive]}
                onPress={() => setMeal(m)}
              >
                <Text style={[styles.mealText, meal === m && styles.mealTextActive]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button title="添加" onPress={handleAdd} />
        </Card>

        {/* 当日摄入列表 */}
        <Card>
          <Text style={styles.cardTitle}>当日记录</Text>
          {logsWithNames.length === 0 ? (
            <EmptyState text="今天还没有摄入记录" />
          ) : (
            logsWithNames.map((l) => {
              const factor = l.grams / 100;
              const kcal = (l.food?.kcal_per_100g ?? 0) * factor;
              return (
                <Row
                  key={l.id}
                  left={
                    <View>
                      <Text style={styles.logFood}>
                        {l.food?.name ?? '(已删除食物)'} · {l.grams.toFixed(0)}g
                      </Text>
                      <Text style={styles.logMeta}>
                        {l.meal} · {kcal.toFixed(1)} kcal
                      </Text>
                    </View>
                  }
                  right={
                    <Pressable onPress={() => handleDelete(l.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.sell} />
                    </Pressable>
                  }
                />
              );
            })
          )}
        </Card>
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
});
