// 食物库：搜索 + 营养属性分类 Pills + 食物卡片（Quick Log 一键记录）+ 自定义食物

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { cardShadow, colors, macroColors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { t, tError, type TranslationKey } from '../i18n';
import {
  canonicalCatKind,
  categoryDisplayKey,
  createFoodItem,
  deleteFoodItem,
  filterFoods,
  foodDisplayName,
  foodDisplayNotes,
  foodTags,
  isLowGI,
  updateFoodItem,
  type CatKind,
  type FoodTagKey,
} from '../services/foodService';
import { createIntake } from '../services/intakeService';
import { todayString } from '../db/database';
import type { FoodItem } from '../types';

import QuickLogSheet from '../components/QuickLogSheet';
import EditSheet from '../components/EditSheet';
import ActionSheet from '../components/ActionSheet';
import Toast, { useToast } from '../components/Toast';

type FormMode = 'hidden' | 'add' | 'edit';

// 分类语义色：蛋白蓝 / 脂肪金 / 碳水绿 / 纤维绿 / 抗氧化珊瑚红（Modern & Premium 语义色体系）
function catColor(kind: CatKind | null): string {
  switch (kind) {
    case 'protein':
      return macroColors.protein;
    case 'fat':
      return macroColors.fat;
    case 'carb':
    case 'fiber':
      return macroColors.carb;
    case 'antioxidant':
      return macroColors.calorie;
    default:
      return colors.line;
  }
}

const TAG_COLORS: Record<FoodTagKey, string> = {
  highProtein: macroColors.protein,
  healthyFats: macroColors.fat,
  complexCarb: macroColors.carb,
  highFiber: macroColors.carb,
  antioxidant: macroColors.calorie,
  zeroCarb: macroColors.carb,
  lowGi: colors.ok,
};

const TAG_KEYS: Record<FoodTagKey, TranslationKey> = {
  highProtein: 'food.tag.highProtein',
  healthyFats: 'food.tag.healthyFats',
  complexCarb: 'food.tag.complexCarb',
  highFiber: 'food.tag.highFiber',
  antioxidant: 'food.tag.antioxidant',
  zeroCarb: 'food.tag.zeroCarb',
  lowGi: 'common.lowGi',
};

export default function FoodLibraryScreen() {
  const { categories, foodItems, refresh } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  // Quick Log
  const [quickFood, setQuickFood] = useState<FoodItem | null>(null);

  // 自定义食物表单（EditSheet）
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [gi, setGi] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // 删除确认（ActionSheet，禁用系统 Alert）
  const [deleteTarget, setDeleteTarget] = useState<FoodItem | null>(null);

  // 轻提示 toast（共享 useToast，添加成功/删除失败等非阻塞反馈）
  const { toast, toastOpacity, showToast } = useToast();

  // categoryId → 规范类别（标签派生与语义色条）
  const catKindById = useMemo(() => {
    const map = new Map<number, CatKind | null>();
    for (const c of categories) map.set(c.id, canonicalCatKind(c.name));
    return map;
  }, [categories]);

  const filtered = useMemo(
    () => filterFoods(foodItems, query, selectedCat),
    [foodItems, query, selectedCat]
  );

  function resetForm() {
    setName('');
    setKcal('');
    setProtein('');
    setCarb('');
    setFat('');
    setGi('');
    setNotes('');
    setEditing(null);
    setFormError('');
  }

  function startAdd() {
    resetForm();
    setFormMode('add');
  }

  function startEdit(item: FoodItem) {
    setEditing(item);
    setName(item.name);
    setKcal(String(item.kcal_per_100g));
    setProtein(String(item.protein_per_100g));
    setCarb(String(item.carb_per_100g));
    setFat(String(item.fat_per_100g));
    setGi(item.gi !== null ? String(item.gi) : '');
    setNotes(item.notes ?? '');
    setFormError('');
    setFormMode('edit');
  }

  async function handleSave() {
    const k = Number(kcal);
    const p = Number(protein);
    const c = Number(carb);
    const f = Number(fat);
    const g = gi ? Number(gi) : null;
    if (!name.trim()) {
      setFormError(t('error.ERR_EMPTY_FOOD_NAME'));
      return;
    }
    if (!isFinite(k) || !isFinite(p) || !isFinite(c) || !isFinite(f)) {
      setFormError(t('error.ERR_NUTRITION_NOT_FINITE'));
      return;
    }
    setSaving(true);
    try {
      if (formMode === 'edit' && editing) {
        await updateFoodItem(editing.id, {
          name,
          category_id: editing.category_id,
          kcal_per_100g: k,
          protein_per_100g: p,
          carb_per_100g: c,
          fat_per_100g: f,
          gi: g,
          notes,
        });
      } else {
        await createFoodItem({
          name,
          category_id: selectedCat ?? categories[0]?.id ?? 0,
          kcal_per_100g: k,
          protein_per_100g: p,
          carb_per_100g: c,
          fat_per_100g: f,
          gi: g,
          notes,
        });
      }
      setFormMode('hidden');
      resetForm();
      await refresh();
    } catch (e: unknown) {
      setFormError(tError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteFoodItem(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (e: unknown) {
      setDeleteTarget(null);
      showToast(tError(e));
    }
  }

  async function handleQuickAdd(grams: number, meal: string) {
    if (!quickFood) return;
    await createIntake({
      date: todayString(),
      food_item_id: quickFood.id,
      grams,
      meal,
    });
    await refresh();
    showToast(t('food.addedToast'));
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 搜索框 */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <RNTextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('food.searchPh')}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            maxFontSizeMultiplier={1.4}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* 分类 Pills：All + 营养属性分类 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          <Pressable
            style={[styles.catChip, selectedCat === null && styles.catChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSelectedCat(null);
            }}
          >
            <Text
              style={[styles.catText, selectedCat === null && styles.catTextActive]}
              maxFontSizeMultiplier={1.4}
            >
              {t('common.all')}
            </Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSelectedCat(c.id);
              }}
            >
              <Text
                style={[styles.catText, selectedCat === c.id && styles.catTextActive]}
                maxFontSizeMultiplier={1.4}
              >
                {categoryDisplayKey(c.name) ? t(categoryDisplayKey(c.name)!) : c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ALL FOODS */}
        <View style={styles.section}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
              {t('food.allFoodsTitle')}
            </Text>
            <Text style={styles.countText} maxFontSizeMultiplier={1.4}>
              {t('food.count', { n: filtered.length })}
            </Text>
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.emptyHint} maxFontSizeMultiplier={1.4}>
              {t('food.empty')}
            </Text>
          ) : (
            filtered.map((item) => {
              const kind = catKindById.get(item.category_id) ?? null;
              const tags = foodTags(item, kind);
              const barColor = catColor(kind);
              return (
                <View key={item.id} style={[styles.foodCard, cardShadow]}>
                  <View style={[styles.cardBar, { backgroundColor: barColor }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.foodName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                        {foodDisplayName(item)}
                      </Text>
                      {item.gi !== null && isLowGI(item.gi) && (
                        <Text style={styles.giText} maxFontSizeMultiplier={1.4}>
                          GI {item.gi}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.nutritionRow} maxFontSizeMultiplier={1.4}>
                      <Text style={styles.kcalText}>{item.kcal_per_100g} kcal</Text>
                      {'  ·  '}
                      <Text style={{ color: macroColors.protein }}>
                        P {item.protein_per_100g}g
                      </Text>
                      {'  |  '}
                      <Text style={{ color: macroColors.fat }}>F {item.fat_per_100g}g</Text>
                      {'  |  '}
                      <Text style={{ color: macroColors.carb }}>C {item.carb_per_100g}g</Text>
                    </Text>
                    {tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {tags.map((tag) => {
                          const color = TAG_COLORS[tag];
                          return (
                            <View
                              key={tag}
                              style={[styles.tagChip, { backgroundColor: `${color}1A` }]}
                            >
                              <Text style={[styles.tagText, { color }]} maxFontSizeMultiplier={1.4}>
                                {t(TAG_KEYS[tag])}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {item.notes ? (
                      <Text style={styles.cardNotes} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                        {foodDisplayNotes(item)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.actionCol}>
                    <Pressable
                      style={styles.quickAddBtn}
                      hitSlop={6}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setQuickFood(item);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#ffffff" />
                    </Pressable>
                    <View style={styles.minorActions}>
                      <Pressable onPress={() => startEdit(item)} hitSlop={8}>
                        <Ionicons name="create-outline" size={17} color={colors.muted} />
                      </Pressable>
                      <Pressable onPress={() => setDeleteTarget(item)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* 底部固定轻量级入口：自定义食物 */}
          <Pressable style={styles.createBtn} onPress={startAdd}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.createBtnText} maxFontSizeMultiplier={1.4}>
              {t('food.createCustom')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 成功/失败轻提示 */}
      <Toast message={toast} opacity={toastOpacity} />

      {/* Quick Log 抽屉 */}
      <QuickLogSheet
        visible={quickFood !== null}
        food={quickFood}
        onClose={() => setQuickFood(null)}
        onAdd={handleQuickAdd}
      />

      {/* 新增/编辑食物抽屉 */}
      <EditSheet
        visible={formMode !== 'hidden'}
        title={formMode === 'edit' ? t('food.editTitle') : t('food.addTitle')}
        saving={saving}
        onClose={() => {
          setFormMode('hidden');
          resetForm();
        }}
        onSave={handleSave}
      >
        {formError !== '' && (
          <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
            {formError}
          </Text>
        )}
        <LabeledField label={t('food.name')} value={name} onChangeText={setName} />
        <View style={styles.numRow}>
          <View style={styles.numField}>
            <LabeledField
              label={t('food.kcal100')}
              value={kcal}
              onChangeText={setKcal}
              numeric
            />
          </View>
          <View style={styles.numField}>
            <LabeledField
              label={t('food.protein100')}
              value={protein}
              onChangeText={setProtein}
              numeric
            />
          </View>
        </View>
        <View style={styles.numRow}>
          <View style={styles.numField}>
            <LabeledField
              label={t('food.carb100')}
              value={carb}
              onChangeText={setCarb}
              numeric
            />
          </View>
          <View style={styles.numField}>
            <LabeledField label={t('food.fat100')} value={fat} onChangeText={setFat} numeric />
          </View>
        </View>
        <LabeledField label={t('food.giOptional')} value={gi} onChangeText={setGi} numeric />
        <LabeledField label={t('food.notes')} value={notes} onChangeText={setNotes} />
      </EditSheet>

      {/* 删除确认抽屉（禁系统 Alert） */}
      <ActionSheet
        visible={deleteTarget !== null}
        title={t('food.deleteTitle')}
        message={deleteTarget ? t('food.deleteMsg', { name: deleteTarget.name }) : undefined}
        confirmLabel={t('common.delete')}
        confirmDanger
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

// 表单数字/文本字段（TextField 的 label 版，无内置 margin 干扰 EditSheet 布局）
function LabeledField({
  label,
  value,
  onChangeText,
  numeric,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      <RNTextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'numeric' : 'default'}
        maxFontSizeMultiplier={1.4}
      />
    </View>
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
    paddingBottom: spacing.xl * 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...cardShadow,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  catRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.xs,
  },
  catChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  catText: {
    fontSize: 13,
    color: colors.text,
  },
  catTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  countText: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyHint: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  foodName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  giText: {
    fontSize: 11,
    color: colors.muted,
  },
  nutritionRow: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  kcalText: {
    color: colors.text,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardNotes: {
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  quickAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minorActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  numRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numField: {
    flex: 1,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
});
