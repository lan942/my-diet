// 快速记录抽屉：份量刻度尺 + 预设快捷片 + 餐次分段 + 实时营养预览 + Add to Today
// 视觉沿用 EditSheet 壳：grabber + 手势下拉关闭 + 遮罩点击关闭

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import RulerPicker from './RulerPicker';
import SegmentedControl, { type SegmentOption } from './SegmentedControl';
import { Button } from './ui';
import { colors, spacing, macroColors } from '../theme';
import { t, tError } from '../i18n';
import { defaultMealFor, scaleNutrition } from '../services/intakeService';
import { foodDisplayName, foodPortionLabel } from '../services/foodService';
import type { FoodItem } from '../types';

type MealValue = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_OPTIONS: SegmentOption<MealValue>[] = [
  { label: t('meal.breakfast'), value: 'breakfast' },
  { label: t('meal.lunch'), value: 'lunch' },
  { label: t('meal.dinner'), value: 'dinner' },
  { label: t('meal.snack'), value: 'snack' },
];

const GRAM_PRESETS = [50, 100, 150, 200];

interface QuickLogSheetProps {
  visible: boolean;
  food: FoodItem | null;
  onClose: () => void;
  onAdd: (grams: number, meal: string) => Promise<void>;
}

const CLOSE_THRESHOLD = 120;

// 外壳：Modal + 手势下拉（与 EditSheet 同壳）；内容组件 keyed by food.id，
// 每次打开重新挂载以重置份量/餐次（懒初始化，规避 effect setState）
export default function QuickLogSheet({
  visible,
  food,
  onClose,
  onAdd,
}: QuickLogSheetProps) {
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(0));

  // 关闭动画期间复位偏移，避免下次打开残留
  useEffect(() => {
    if (!visible) translateY.setValue(0);
  }, [visible, translateY]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_THRESHOLD || g.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  );

  return (
    <Modal
      visible={visible && food !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mask}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: spacing.xl + 8 + insets.bottom },
            { transform: [{ translateY }] },
          ]}
        >
          {/* 头部：下拉手势区 */}
          <View {...panResponder.panHandlers}>
            <View style={styles.grabber} />
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>
              {t('food.quickLogTitle')}
            </Text>
            <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
              {t('food.quickLogHint')}
            </Text>
          </View>

          {food !== null && (
            <QuickLogBody key={food.id} food={food} onClose={onClose} onAdd={onAdd} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// 内容：双模式份量（生活化份量 ⇄ 精确克数）+ 餐次分段 + 实时营养预览 + Add to Today
function QuickLogBody({
  food,
  onClose,
  onAdd,
}: {
  food: FoodItem;
  onClose: () => void;
  onAdd: (grams: number, meal: string) => Promise<void>;
}) {
  const portions = food.portions;
  const hasPortions = !!portions && portions.length > 0;
  const [mode, setMode] = useState<'portions' | 'grams'>(() => (hasPortions ? 'portions' : 'grams'));
  const [portionIdx, setPortionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<MealValue>(() => defaultMealFor(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const portion = hasPortions ? portions![Math.min(portionIdx, portions!.length - 1)] : null;
  const effectiveGrams = mode === 'portions' && portion ? Math.round(qty * portion.grams) : grams;

  async function handleAdd() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onAdd(effectiveGrams, meal);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onClose();
    } catch (e: unknown) {
      setError(tError(e));
      setSaving(false);
    }
  }

  function pickPreset(v: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGrams(v);
  }

  function pickPortion(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPortionIdx(i);
  }

  const preview = scaleNutrition(food, effectiveGrams);
  const modeOptions: SegmentOption<'portions' | 'grams'>[] = [
    { label: t('food.modePortions'), value: 'portions' },
    { label: t('food.modeGrams'), value: 'grams' },
  ];

  return (
    <View style={styles.body}>
      {/* 食物名 + 100g 营养摘要 */}
      <View style={styles.foodHead}>
        <Text style={styles.foodName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {foodDisplayName(food)}
        </Text>
        <Text style={styles.foodSub} maxFontSizeMultiplier={1.4}>
          {t('food.per100g')} · {food.kcal_per_100g} kcal
        </Text>
      </View>

      {hasPortions && (
        <SegmentedControl options={modeOptions} value={mode} onChange={setMode} />
      )}

      {mode === 'portions' && portion ? (
        <>
          {/* 生活化份量锚点胶囊 */}
          <View style={styles.presetRow}>
            {portions!.map((p, i) => (
              <Pressable
                key={`${p.en}-${p.grams}`}
                style={[styles.preset, i === portionIdx && styles.presetActive]}
                onPress={() => pickPortion(i)}
              >
                <Text
                  style={[styles.presetText, i === portionIdx && styles.presetTextActive]}
                  maxFontSizeMultiplier={1.4}
                >
                  {foodPortionLabel(p)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 数量刻度尺 + 换算提示 */}
          <RulerPicker
            min={0.5}
            max={8}
            step={0.5}
            value={qty}
            unit={t('food.portionUnit')}
            icon="hand-left-outline"
            onChange={setQty}
          />
          <Text style={styles.convertTip} maxFontSizeMultiplier={1.4}>
            ≈ {effectiveGrams} g
          </Text>
        </>
      ) : (
        <>
          {/* 份量：预设快捷片 */}
          <View style={styles.presetRow}>
            {GRAM_PRESETS.map((v) => (
              <Pressable
                key={v}
                style={[styles.preset, grams === v && styles.presetActive]}
                onPress={() => pickPreset(v)}
              >
                <Text
                  style={[styles.presetText, grams === v && styles.presetTextActive]}
                  maxFontSizeMultiplier={1.4}
                >
                  {v}g
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 份量刻度尺（拖动逐格触觉反馈） */}
          <RulerPicker
            min={10}
            max={500}
            step={10}
            value={grams}
            unit="g"
            icon="scale-outline"
            onChange={setGrams}
          />
        </>
      )}

      {/* 餐次 */}
      <Text style={styles.mealLabel} maxFontSizeMultiplier={1.4}>
        {t('food.mealLabel')}
      </Text>
      <SegmentedControl options={MEAL_OPTIONS} value={meal} onChange={setMeal} />

      {/* 实时营养预览 */}
      <View style={styles.preview}>
        <View style={styles.previewItem}>
          <Text style={[styles.previewValue, { color: macroColors.calorie }]} maxFontSizeMultiplier={1.4}>
            {preview.kcal.toFixed(0)}
          </Text>
          <Text style={styles.previewLabel} maxFontSizeMultiplier={1.4}>
            kcal
          </Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewValue, { color: macroColors.protein }]} maxFontSizeMultiplier={1.4}>
            {preview.protein.toFixed(1)}
          </Text>
          <Text style={styles.previewLabel} maxFontSizeMultiplier={1.4}>
            P
          </Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewValue, { color: macroColors.carb }]} maxFontSizeMultiplier={1.4}>
            {preview.carb.toFixed(1)}
          </Text>
          <Text style={styles.previewLabel} maxFontSizeMultiplier={1.4}>
            C
          </Text>
        </View>
        <View style={styles.previewItem}>
          <Text style={[styles.previewValue, { color: macroColors.fat }]} maxFontSizeMultiplier={1.4}>
            {preview.fat.toFixed(1)}
          </Text>
          <Text style={styles.previewLabel} maxFontSizeMultiplier={1.4}>
            F
          </Text>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
          {error}
        </Text>
      ) : null}

      <Button
        title={saving ? t('onboarding.saving') : t('food.addToToday')}
        onPress={handleAdd}
        disabled={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  body: {
    paddingTop: spacing.sm,
  },
  foodHead: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  foodSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  preset: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  presetActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetText: {
    fontSize: 13,
    color: colors.text,
  },
  presetTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  convertTip: {
    fontSize: 13,
    fontWeight: '600',
    color: macroColors.calorie,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  mealLabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  previewItem: {
    alignItems: 'center',
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
