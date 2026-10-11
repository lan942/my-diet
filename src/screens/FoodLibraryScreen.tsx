// 食物库：分类筛选、食物列表、低 GI 标签、新增/编辑/删除

import React, { useMemo, useState } from 'react';
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
import { Button, TextField, Row } from '../components/ui';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import {
  createFoodItem,
  deleteFoodItem,
  isLowGI,
  updateFoodItem,
} from '../services/foodService';
import type { FoodItem } from '../types';

type FormMode = 'hidden' | 'add' | 'edit';

export default function FoodLibraryScreen() {
  const { categories, foodItems, refresh } = useApp();
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [gi, setGi] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(
    () =>
      selectedCat === null
        ? foodItems
        : foodItems.filter((f) => f.category_id === selectedCat),
    [foodItems, selectedCat]
  );

  function resetForm() {
    setName('');
    setKcal('');
    setProtein('');
    setCarb('');
    setFat('');
    setGi('');
    setNotes('');
    setEditingId(null);
  }

  function startAdd() {
    resetForm();
    setFormMode('add');
  }

  function startEdit(item: FoodItem) {
    setEditingId(item.id);
    setName(item.name);
    setKcal(String(item.kcal_per_100g));
    setProtein(String(item.protein_per_100g));
    setCarb(String(item.carb_per_100g));
    setFat(String(item.fat_per_100g));
    setGi(item.gi !== null ? String(item.gi) : '');
    setNotes(item.notes ?? '');
    setFormMode('edit');
  }

  async function handleSubmit() {
    const k = Number(kcal);
    const p = Number(protein);
    const c = Number(carb);
    const f = Number(fat);
    const g = gi ? Number(gi) : null;
    if (!name.trim()) return Alert.alert('错误', '名称不能为空');
    if (!isFinite(k) || !isFinite(p) || !isFinite(c) || !isFinite(f))
      return Alert.alert('错误', '营养值必须为数字');
    try {
      if (formMode === 'edit' && editingId !== null) {
        await updateFoodItem(editingId, {
          name,
          category_id: selectedCat ?? categories[0]?.id ?? 0,
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
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  async function handleDelete(item: FoodItem) {
    Alert.alert('删除确认', `确定删除「${item.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFoodItem(item.id);
            await refresh();
          } catch (e: any) {
            Alert.alert('错误', e?.message ?? '无法删除');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 分类筛选 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          <Pressable
            style={[styles.catChip, selectedCat === null && styles.catChipActive]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[styles.catText, selectedCat === null && styles.catTextActive]}>全部</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
              onPress={() => setSelectedCat(c.id)}
            >
              <Text style={[styles.catText, selectedCat === c.id && styles.catTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 食物列表 */}
        <Card>
          <View style={styles.listHeader}>
            <Text style={styles.cardTitle}>共 {filtered.length} 种食物</Text>
            <Pressable onPress={startAdd}>
              <Ionicons name="add-circle-outline" size={26} color={colors.accent} />
            </Pressable>
          </View>
          {filtered.length === 0 ? (
            <Text style={styles.emptyHint}>暂无食物</Text>
          ) : (
            filtered.map((item) => (
              <Row
                key={item.id}
                left={
                  <View>
                    <View style={styles.nameRow}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      {item.gi !== null && isLowGI(item.gi) && (
                        <View style={styles.lowGiBadge}>
                          <Text style={styles.lowGiText}>低 GI</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.foodDetail}>
                      {item.kcal_per_100g} kcal · P{item.protein_per_100g} C{item.carb_per_100g} F{item.fat_per_100g}
                      {item.gi !== null ? ` · GI ${item.gi}` : ''}
                    </Text>
                  </View>
                }
                right={
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => startEdit(item)} hitSlop={8}>
                      <Ionicons name="create-outline" size={18} color={colors.accent} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                }
              />
            ))
          )}
        </Card>

        {/* 表单 */}
        {formMode !== 'hidden' && (
          <Card>
            <Text style={styles.cardTitle}>
              {formMode === 'edit' ? '编辑食物' : '新增食物'}
            </Text>
            <TextField label="名称" value={name} onChangeText={setName} />
            <View style={styles.numRow}>
              <View style={styles.numField}>
                <TextField label="kcal/100g" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
              </View>
              <View style={styles.numField}>
                <TextField label="蛋白/100g" value={protein} onChangeText={setProtein} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.numRow}>
              <View style={styles.numField}>
                <TextField label="碳水/100g" value={carb} onChangeText={setCarb} keyboardType="numeric" />
              </View>
              <View style={styles.numField}>
                <TextField label="脂肪/100g" value={fat} onChangeText={setFat} keyboardType="numeric" />
              </View>
            </View>
            <TextField label="GI（可选）" value={gi} onChangeText={setGi} keyboardType="numeric" />
            <TextField label="备注" value={notes} onChangeText={setNotes} />
            <View style={styles.formActions}>
              <Button title="取消" variant="ghost" onPress={() => setFormMode('hidden')} />
              <View style={{ width: spacing.sm }} />
              <Button title="保存" onPress={handleSubmit} />
            </View>
          </Card>
        )}
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  emptyHint: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  lowGiBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowGiText: {
    fontSize: 11,
    color: colors.ok,
    fontWeight: '600',
  },
  foodDetail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  numRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numField: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
});
