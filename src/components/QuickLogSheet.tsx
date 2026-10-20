// 快速记录抽屉：份量刻度尺 + 预设快捷片 + 餐次分段 + 实时营养预览 + Add to Today
// 视觉沿用 EditSheet 壳：grabber + 手势下拉关闭 + 遮罩点击关闭

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import RulerPicker from './RulerPicker';
import SegmentedControl, { type SegmentOption } from './SegmentedControl';
import { Button } from './ui';
import { spacing, macroColors, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t, tError } from '../i18n';
import { defaultMealFor, scaleNutrition, parseCustomGrams, resolvePortionPrefill, normalizeMealValue, type MealValue } from '../services/intakeService';
import { foodDisplayName, foodPortionLabel } from '../services/foodService';
import type { FoodItem, IntakeLog } from '../types';

const GRAM_PRESETS = [50, 100, 150, 200];

interface QuickLogSheetProps {
  visible: boolean;
  food: FoodItem | null;
  onClose: () => void;
  onAdd: (grams: number, meal: string) => Promise<void>;
  // 编辑态：传入既有记录时按编辑语义预填与渲染（标题/按钮文案切换）；null 为新增态
  editingLog?: IntakeLog | null;
}

const CLOSE_THRESHOLD = 120;

// 模块级工厂：手势实例只创建一次。关闭判定为工厂内部插槽，
// 由组件 effect 接线最新闭包（保证 useState initializer 内零 ref 捕获，满足 react-hooks 规则）
function createSheetPanResponder(translateY: Animated.Value, onClose: () => void) {
  let canCloseFn: () => boolean = () => true;
  const pr = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (canCloseFn() && (g.dy > CLOSE_THRESHOLD || g.vy > 1.2)) {
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
  });
  return { pr, setCanClose: (fn: () => boolean) => void (canCloseFn = fn) };
}

// 外壳：Modal + 手势下拉（与 EditSheet 同壳）；内容组件 keyed by food.id，
// 每次打开重新挂载以重置份量/餐次（懒初始化，规避 effect setState）
export default function QuickLogSheet({
  visible,
  food,
  onClose,
  onAdd,
  editingLog = null,
}: QuickLogSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(0));
  // 保存进行中锁定关闭通道（遮罩/返回键/下拉手势），避免抽屉卸载导致失败反馈丢失
  const [busy, setBusy] = useState(false);
  // 手势回调在 PanResponder 创建后长期存活，用 ref 读取最新 busy（仅 effect/事件回调访问）
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // 关闭后复位 busy：render 期随 prop 调整 state（React 官方模式），规避 effect 级联渲染。
  // translateY 无需复位：所有手势关闭路径均已回弹/归零，遮罩关闭时本就为 0
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) setBusy(false);
  }

  // 受 busy 保护的关闭入口；保存成功后代码直接调用原始 onClose 不受限
  const guardClose = () => {
    if (!busyRef.current) onClose();
  };

  const [sheetPan] = useState(() => createSheetPanResponder(translateY, onClose));
  // 每次提交后接线最新 busy 判定（无状态写入，仅替换插槽函数）
  useEffect(() => {
    sheetPan.setCanClose(() => !busyRef.current);
  });
  const panResponder = sheetPan.pr;

  // 外壳统一持有 busy：失败时复位并把错误抛给内容区展示
  const handleAddLocked = async (gramsValue: number, mealValue: string) => {
    setBusy(true);
    try {
      await onAdd(gramsValue, mealValue);
    } catch (e) {
      setBusy(false);
      throw e;
    }
  };

  return (
    <Modal
      visible={visible && food !== null}
      transparent
      animationType="slide"
      onRequestClose={guardClose}
    >
      <View style={styles.mask}>
        <Pressable style={StyleSheet.absoluteFill} onPress={guardClose} />
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
              {editingLog ? t('intake.editTitle') : t('food.quickLogTitle')}
            </Text>
            <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
              {editingLog ? t('intake.editHint') : t('food.quickLogHint')}
            </Text>
          </View>

          {food !== null && (
            <QuickLogBody
              key={editingLog ? `edit-${editingLog.id}` : food.id}
              food={food}
              editingLog={editingLog}
              onClose={onClose}
              onAdd={handleAddLocked}
              busy={busy}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// 内容：双模式份量（生活化份量 ⇄ 精确克数）+ 餐次分段 + 实时营养预览 + 提交
// 编辑态（editingLog 非空）：预填当前克数/餐次，克数可反解份量时落到份量模式
function QuickLogBody({
  food,
  editingLog,
  onClose,
  onAdd,
  busy,
}: {
  food: FoodItem;
  editingLog: IntakeLog | null;
  onClose: () => void;
  onAdd: (grams: number, meal: string) => Promise<void>;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const portions = food.portions;
  const hasPortions = !!portions && portions.length > 0;
  // 编辑态份量反解：仅计算一次（组件 keyed by 记录/食物 id，打开即重挂载）
  const [prefill] = useState(() =>
    editingLog ? resolvePortionPrefill(portions, editingLog.grams) : null
  );
  const [mode, setMode] = useState<'portions' | 'grams'>(() =>
    editingLog ? (prefill ? 'portions' : 'grams') : hasPortions ? 'portions' : 'grams'
  );
  const [portionIdx, setPortionIdx] = useState(() => prefill?.anchorIdx ?? 0);
  const [qty, setQty] = useState(() => prefill?.qty ?? 1);
  const [grams, setGrams] = useState(() => editingLog?.grams ?? 100);
  const [meal, setMeal] = useState<MealValue>(() =>
    editingLog ? normalizeMealValue(editingLog.meal) : defaultMealFor(new Date())
  );
  const [error, setError] = useState('');

  // 渲染期构造，跟随当前语言（禁止模块顶层调用 t() 固化文案）
  const mealOptions: SegmentOption<MealValue>[] = [
    { label: t('meal.breakfast'), value: 'breakfast' },
    { label: t('meal.lunch'), value: 'lunch' },
    { label: t('meal.dinner'), value: 'dinner' },
    { label: t('meal.snack'), value: 'snack' },
  ];

  const portion = hasPortions ? portions![Math.min(portionIdx, portions!.length - 1)] : null;
  const effectiveGrams = mode === 'portions' && portion ? Math.round(qty * portion.grams) : grams;

  // 渲染期同步最新有效克数到 ref：手动输入未失焦直接点提交时，dismiss 引发的 blur 提交会
  // 触发 setGrams 重渲染，但正在执行的 handleAdd 闭包仍持旧值，必须经 ref 读取最新结果
  const effectiveGramsRef = useRef(effectiveGrams);
  effectiveGramsRef.current = effectiveGrams;
  // 手动输入最近一次校验结果：非法输入中止提交（保留抽屉展示错误），合法输入清除标记
  const gramsInputInvalidRef = useRef(false);
  // 提交入口锁：busy 由外层在 onAdd 调用时才置位，dismiss 等待窗口需本地锁防重复提交
  const submittingRef = useRef(false);

  async function handleAdd() {
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    try {
      // 手动输入克数且未失焦时：先收键盘让 onBlur 提交输入，等一帧确保 ref 已同步新值
      if (mode === 'grams' && Keyboard.isVisible()) {
        Keyboard.dismiss();
        await new Promise((r) => setTimeout(r, 60));
        // 未失焦的输入非法：中止提交，保留抽屉展示错误（避免按旧值静默写入）
        if (gramsInputInvalidRef.current) return;
      }
      await onAdd(effectiveGramsRef.current, meal);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onClose();
    } catch (e: unknown) {
      setError(tError(e));
    } finally {
      submittingRef.current = false;
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

  // 手动输入克数提交：非法输入提示并保留上次有效值（标记供 handleAdd 中止提交），
  // 合法则写回（刻度尺按既有 clamp 吸附显示）
  function commitGramsInput(raw: string) {
    const parsed = parseCustomGrams(raw);
    if (parsed === null) {
      gramsInputInvalidRef.current = true;
      setError(t('food.gramsInvalid'));
      return;
    }
    gramsInputInvalidRef.current = false;
    setError('');
    setGrams(parsed);
  }

  const preview = scaleNutrition(food, effectiveGrams);
  const modeOptions: SegmentOption<'portions' | 'grams'>[] = [
    { label: t('food.modePortions'), value: 'portions' },
    { label: t('food.modeGrams'), value: 'grams' },
  ];

  return (
    <>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* 食物名 + 100g 营养摘要 */}
      <View style={styles.foodHead}>
        <Text style={styles.foodName} maxFontSizeMultiplier={1.4}>
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
                accessibilityRole="radio"
                accessibilityState={{ checked: i === portionIdx }}
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
                accessibilityRole="radio"
                accessibilityState={{ checked: grams === v }}
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

          {/* 份量刻度尺（拖动逐格触觉反馈，点击数值可直接输入任意克数） */}
          <RulerPicker
            min={10}
            max={2000}
            step={10}
            value={grams}
            unit="g"
            icon="scale-outline"
            onChange={setGrams}
            onValueInput={commitGramsInput}
            // 显示层不做量程钳制：手动输入 1–9g 等越界值时数值如实显示，仅尺身 pin 吸附边界
            formatValue={() => String(grams)}
          />
          <Text style={styles.editTip} maxFontSizeMultiplier={1.4}>
            {t('food.gramsEditHint')}
          </Text>
        </>
      )}

      {/* 餐次 */}
      <Text style={styles.mealLabel} maxFontSizeMultiplier={1.4}>
        {t('food.mealLabel')}
      </Text>
      <SegmentedControl options={mealOptions} value={meal} onChange={setMeal} />

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

      </ScrollView>

      {error ? (
        <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
          {error}
        </Text>
      ) : null}

      <Button
        title={
          busy
            ? t('onboarding.saving')
            : editingLog
              ? t('intake.saveEdit')
              : t('food.addToToday')
        }
        onPress={handleAdd}
        disabled={busy}
      />
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
    maxHeight: '88%',
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
    flexGrow: 0,
  },
  bodyContent: {
    paddingVertical: spacing.sm,
  },
  foodHead: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
  foodSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  preset: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
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
  editTip: {
    fontSize: 12,
    color: colors.muted,
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
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  previewItem: {
    alignItems: 'center',
    minWidth: '25%',
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
