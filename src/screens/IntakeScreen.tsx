// 今日：选食物录克数与餐次、当日汇总、达成率、按日切换、删除记录

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField, Row, EmptyState } from '../components/ui';
import Toast, { useToast } from '../components/Toast';
import DateBar from '../components/DateBar';
import ProgressBar from '../components/ProgressBar';
import ActionSheet from '../components/ActionSheet';
import EditSheet from '../components/EditSheet';
import { spacing, macroColors, typeScale, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../state/AppContext';
import { t, tError, formatNumber, type TranslationKey } from '../i18n';
import {
  createIntake,
  deleteIntake,
  scaleNutrition,
  summarizeDaily,
} from '../services/intakeService';
import { computeTarget } from '../services/targetService';
import { computeEnergyBalance } from '../services/energyBalance';
import {
  recordManualSteps,
  clearStepRecord,
  MAX_MANUAL_STEPS,
} from '../services/stepService';
import { useDeviceSteps } from '../hooks/useDeviceSteps';
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

// 餐次显示文案：合法/旧值映射到翻译；未知值原样展示（不再静默兜底成午餐）
function mealLabelText(value: string): string {
  const canonical = LEGACY_MEAL_VALUES[value] ?? value;
  const key = MEALS.find((m) => m.value === canonical)?.key as TranslationKey | undefined;
  return key ? t(key) : value;
}

export default function IntakeScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
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
  // 设备步数（今日页唯一步数出口：自动同步/连接状态）
  const deviceSteps = useDeviceSteps(currentDate);
  // 能量平衡（纯派生）：步数消耗 → 调整后热量目标 / 净热量 / 剩余
  const balance = useMemo(() => {
    if (!config || !target) return null;
    return computeEnergyBalance({
      targetKcal: target.daily_calorie,
      intakeKcal: summary.total_kcal,
      steps: deviceSteps.steps,
      weightKg: config.weight_kg,
    });
  }, [config, target, summary.total_kcal, deviceSteps.steps]);
  const [showPicker, setShowPicker] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // 待删除记录（ActionSheet 二次确认，禁用系统 Alert）
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // 步数手动录入抽屉（EditSheet，禁用系统 Alert）
  const [showStepsEdit, setShowStepsEdit] = useState(false);
  const [stepsInput, setStepsInput] = useState('');
  const [stepsError, setStepsError] = useState('');
  const [stepsSaving, setStepsSaving] = useState(false);
  const { toast, toastOpacity, showToast } = useToast();

  // 首次连接：唯一会触发系统健康权限弹窗的路径
  async function handleConnectSteps() {
    const result = await deviceSteps.connect();
    if (result === 'denied') showToast(t('sync.denied'));
    else if (result === 'unavailable') showToast(t('sync.unavailable'));
  }

  // 已连接后的手动刷新（manual 日跳过：用户显式覆盖值优先于平台）
  async function handleSyncSteps() {
    if (deviceSteps.source === 'manual') {
      showToast(t('steps.manualSkipToast'));
      return;
    }
    const result = await deviceSteps.syncNow();
    if (result.ok) {
      showToast(t('sync.success', { steps: formatNumber(result.steps) }));
    } else if (result.reason === 'manual-override') {
      showToast(t('steps.manualSkipToast'));
    } else {
      showToast(
        result.reason === 'unavailable' ? t('sync.unavailable') : t('sync.denied')
      );
    }
  }

  // 打开步数编辑抽屉：预填当日当前值（无记录为空）
  function openStepsEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStepsInput(deviceSteps.steps === null ? '' : String(deviceSteps.steps));
    setStepsError('');
    setShowStepsEdit(true);
  }

  // 保存手动步数：前置校验 → 服务层校验（非负整数 ≤ 上限）→ 原地 refresh
  async function handleStepsSave() {
    if (stepsSaving) return;
    const raw = stepsInput.trim();
    const n = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > MAX_MANUAL_STEPS) {
      setStepsError(t('steps.editInvalid'));
      return;
    }
    setStepsSaving(true);
    setStepsError('');
    try {
      await recordManualSteps(currentDate, n);
      await refresh();
      setShowStepsEdit(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      showToast(t('steps.manualSaved'));
    } catch (e: unknown) {
      setStepsError(tError(e));
    } finally {
      setStepsSaving(false);
    }
  }

  // 清除手动值：删行后该日恢复平台权威（后续自动同步可重新写入）
  async function handleStepsClear() {
    if (stepsSaving) return;
    setStepsSaving(true);
    setStepsError('');
    try {
      await clearStepRecord(currentDate);
      await refresh();
      setShowStepsEdit(false);
      showToast(t('steps.manualCleared'));
    } catch {
      setStepsError(t('steps.saveFailed'));
    } finally {
      setStepsSaving(false);
    }
  }

  // 汇总请求序号：快速切日时旧查询后解析不得覆盖新日期汇总
  const summarySeq = useRef(0);
  useEffect(() => {
    const seq = ++summarySeq.current;
    summarizeDaily(currentDate)
      .then((s) => {
        if (seq === summarySeq.current) setSummary(s);
      })
      .catch(() => {});
  }, [currentDate, intakeLogs]);

  // 切日重置录入草稿，避免把上一日的食物/克数/餐次误提交到新日期。
  // render 期随 prop 调整 state（React 官方模式），避免 effect 同步 setState 级联渲染
  const [prevDate, setPrevDate] = useState(currentDate);
  if (currentDate !== prevDate) {
    setPrevDate(currentDate);
    setGrams('');
    setSelectedFoodId(null);
    setMeal('lunch');
    setShowPicker(false);
    setFormError('');
    setShowStepsEdit(false);
    setStepsInput('');
    setStepsError('');
  }

  const logsWithNames = useMemo(() => {
    const map = new Map(foodItems.map((f) => [f.id, f]));
    return intakeLogs.map((l) => ({
      ...l,
      food: map.get(l.food_item_id),
    }));
  }, [intakeLogs, foodItems]);

  async function handleAdd() {
    if (saving) return; // 防重入：双击/快速点按只产生一条记录
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
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
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

        {/* 步数（设备自动同步 + 手动录入覆盖） */}
        <Card>
          <View style={styles.stepsHeader}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
              {t('steps.cardTitle')}
            </Text>
            <View style={styles.stepsHeaderActions}>
              {/* 编辑入口：所有同步态可点（含平台不可用/权限拒绝降级态的手动兜底） */}
              <Pressable
                onPress={openStepsEdit}
                style={styles.editButton}
                accessibilityRole="button"
                accessibilityLabel={t('steps.editTitle')}
              >
                <Ionicons name="pencil" size={17} color={macroColors.steps} />
              </Pressable>
              {deviceSteps.syncState === 'connected' ||
              deviceSteps.syncState === 'syncing' ? (
                <Pressable
                  onPress={handleSyncSteps}
                  style={styles.syncButton}
                  disabled={deviceSteps.syncState === 'syncing'}
                  accessibilityLabel={t('sync.button')}
                >
                  {deviceSteps.syncState === 'syncing' ? (
                    <ActivityIndicator size="small" color={macroColors.steps} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={macroColors.steps} />
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* 有记录时值优先展示（manual/legacy 记录不依赖连接状态） */}
          {deviceSteps.steps !== null ||
          deviceSteps.syncState === 'connected' ||
          deviceSteps.syncState === 'syncing' ? (
            <>
              <View style={styles.stepsRow}>
                <Ionicons name="footsteps" size={26} color={macroColors.steps} />
                {deviceSteps.steps === null &&
                deviceSteps.syncState === 'syncing' ? (
                  <Text style={styles.stepsSyncingText} maxFontSizeMultiplier={1.4}>
                    {t('steps.syncing')}
                  </Text>
                ) : (
                  <Text style={styles.stepsValue} maxFontSizeMultiplier={2}>
                    {deviceSteps.steps === null
                      ? '—'
                      : formatNumber(deviceSteps.steps)}
                  </Text>
                )}
                <Text style={styles.stepsUnit} maxFontSizeMultiplier={1.4}>
                  {t('steps.unit')}
                </Text>
                {deviceSteps.source === 'manual' ? (
                  <Text style={styles.manualTag} maxFontSizeMultiplier={1.4}>
                    {t('steps.manualTag')}
                  </Text>
                ) : null}
                <Text style={styles.stepsKcal} maxFontSizeMultiplier={1.4}>
                  {t('steps.kcalHint', {
                    kcal: (balance?.stepsKcal ?? 0).toFixed(0),
                  })}
                </Text>
              </View>
              {deviceSteps.syncState === 'unavailable' ? (
                <Text style={styles.stepsHint} maxFontSizeMultiplier={1.4}>
                  {t('sync.unavailable')}
                </Text>
              ) : null}
              {deviceSteps.syncState === 'not-connected' ||
              deviceSteps.syncState === 'denied' ? (
                <View style={styles.connectBox}>
                  {deviceSteps.syncState === 'denied' ? (
                    <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
                      {t('sync.denied')}
                    </Text>
                  ) : null}
                  <Text style={styles.stepsHint} maxFontSizeMultiplier={1.4}>
                    {t('sync.rationale')}
                  </Text>
                  <Button
                    title={t('steps.connect')}
                    variant="ghost"
                    onPress={handleConnectSteps}
                  />
                </View>
              ) : null}
            </>
          ) : deviceSteps.syncState === 'unavailable' ? (
            <Text style={styles.stepsHint} maxFontSizeMultiplier={1.4}>
              {t('sync.unavailable')}
            </Text>
          ) : (
            <View style={styles.connectBox}>
              <Text style={styles.stepsStatus} maxFontSizeMultiplier={1.4}>
                {t('steps.notConnected')}
              </Text>
              <Text style={styles.stepsHint} maxFontSizeMultiplier={1.4}>
                {t('sync.rationale')}
              </Text>
              {deviceSteps.syncState === 'denied' ? (
                <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
                  {t('sync.denied')}
                </Text>
              ) : null}
              <Button
                title={t('steps.connect')}
                variant="ghost"
                onPress={handleConnectSteps}
              />
            </View>
          )}
        </Card>

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
                target={balance ? balance.adjustedCalorie : target.daily_calorie}
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
              {balance ? (
                <View style={styles.energyBox}>
                  <View style={styles.energyRow}>
                    <Text style={styles.energyLabel} maxFontSizeMultiplier={1.4}>
                      {t('energy.net')}
                    </Text>
                    <Text style={styles.energyValue} maxFontSizeMultiplier={1.4}>
                      {balance.netKcal.toFixed(0)} kcal
                    </Text>
                    <Text style={styles.energyLabel} maxFontSizeMultiplier={1.4}>
                      {t('energy.remaining')}
                    </Text>
                    <Text
                      style={[
                        styles.energyValue,
                        balance.remaining < 0 && styles.energyOver,
                      ]}
                      maxFontSizeMultiplier={1.4}
                    >
                      {balance.remaining.toFixed(0)} kcal
                    </Text>
                  </View>
                  {balance.stepsKcal > 0 ? (
                    <Text style={styles.energyHint} maxFontSizeMultiplier={1.4}>
                      {t('energy.adjustedHint')} · {balance.adjustedCalorie.toFixed(0)} kcal
                    </Text>
                  ) : null}
                </View>
              ) : null}
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
            accessibilityRole="button"
            accessibilityLabel={t('intake.selectFood')}
            accessibilityState={{ expanded: showPicker }}
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
                accessibilityRole="radio"
                accessibilityState={{ checked: meal === m.value }}
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
          <Button
            title={saving ? t('onboarding.saving') : t('intake.add')}
            onPress={handleAdd}
            disabled={saving}
          />
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
              const kcal = l.food ? scaleNutrition(l.food, l.grams).kcal : 0;
              return (
                <Row
                  key={l.id}
                  left={
                    <View>
                      <Text style={styles.logFood} maxFontSizeMultiplier={1.4}>
                        {l.food ? foodDisplayName(l.food) : t('intake.deletedFood')} · {l.grams.toFixed(0)}g
                      </Text>
                      <Text style={styles.logMeta} maxFontSizeMultiplier={1.4}>
                        {mealLabelText(l.meal)} · {kcal.toFixed(1)} kcal
                      </Text>
                    </View>
                  }
                  right={
                    <Pressable
                      onPress={() => setDeleteId(l.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('common.delete')} ${l.food ? foodDisplayName(l.food) : t('intake.deletedFood')}`}
                      style={styles.iconButton}
                    >
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

      {/* 删除摄入二次确认（自定义抽屉，禁系统 Alert） */}
      <ActionSheet
        visible={deleteId !== null}
        title={t('intake.deleteTitle')}
        message={t('intake.deleteMsg')}
        confirmLabel={t('common.delete')}
        confirmDanger
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      {/* 步数手动录入（自定义编辑抽屉：保存/清除手动值，禁系统 Alert） */}
      <EditSheet
        visible={showStepsEdit}
        title={t('steps.editTitle')}
        hint={t('steps.editHint')}
        error={stepsError}
        saving={stepsSaving}
        onClose={() => setShowStepsEdit(false)}
        onSave={handleStepsSave}
      >
        <TextField
          label={t('steps.editLabel')}
          value={stepsInput}
          onChangeText={(v) => {
            setStepsInput(v);
            setStepsError('');
          }}
          keyboardType="numeric"
          placeholder={t('steps.editPh')}
        />
        {deviceSteps.source === 'manual' ? (
          <Button
            title={t('steps.clearManual')}
            variant="ghost"
            onPress={handleStepsClear}
            disabled={stepsSaving}
          />
        ) : null}
      </EditSheet>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
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
    fontSize: typeScale.body + 1,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
  },
  editButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
  },
  manualTag: {
    fontSize: 11,
    fontWeight: '600',
    color: macroColors.steps,
    borderWidth: 1,
    borderColor: macroColors.steps,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    paddingVertical: spacing.xs,
  },
  stepsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: macroColors.steps,
  },
  stepsUnit: {
    fontSize: 13,
    color: colors.muted,
  },
  stepsKcal: {
    fontSize: 13,
    color: colors.muted,
    marginLeft: 'auto',
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#fbefee',
  },
  stepsHint: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: 'center',
  },
  stepsStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: macroColors.steps,
  },
  stepsSyncingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
  },
  connectBox: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  energyBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  energyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  energyLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  energyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  energyOver: {
    color: colors.danger,
  },
  energyHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'right',
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
    minHeight: 48,
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
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerItemActive: {
    backgroundColor: colors.accentSoft,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
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
