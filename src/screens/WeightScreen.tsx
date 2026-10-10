// 体重页：录入体重、列表、目标展示

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
import { Button, TextField, Row } from '../components/ui';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { createWeight, deleteWeight, getLatestWeight } from '../services/weightService';
import { computeTarget } from '../services/targetService';
import type { TargetResult } from '../types';

export default function WeightScreen() {
  const { weights, config, refresh } = useApp();
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<TargetResult | null>(null);

  useEffect(() => {
    if (config) {
      getLatestWeight()
        .then((w) => setTarget(computeTarget(w, config)))
        .catch(() => {});
    }
  }, [config, weights]);

  async function handleSave() {
    const kg = Number(input);
    if (!isFinite(kg) || kg <= 0) {
      Alert.alert('错误', '体重必须为正数');
      return;
    }
    try {
      await createWeight(kg);
      setInput('');
      await refresh();
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  async function handleDelete(id: number) {
    Alert.alert('删除确认', '确定删除这条体重记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteWeight(id);
          await refresh();
        },
      },
    ]);
  }

  const latest = weights[0];

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 目标展示 */}
        <Card>
          <Text style={styles.cardTitle}>每日目标（估算）</Text>
          {latest && target ? (
            <>
              <View style={styles.targetRow}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue}>{target.daily_calorie.toFixed(0)}</Text>
                  <Text style={styles.targetUnit}>kcal</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue}>{target.daily_protein.toFixed(1)}</Text>
                  <Text style={styles.targetUnit}>g 蛋白质</Text>
                </View>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroItem}>碳水 {target.carb_g.toFixed(1)}g</Text>
                <Text style={styles.macroItem}>蛋白 {target.protein_g.toFixed(1)}g</Text>
                <Text style={styles.macroItem}>脂肪 {target.fat_g.toFixed(1)}g</Text>
              </View>
              <Text style={styles.note}>公式：体重 × 系数；宏量比例可在「设置」调整</Text>
            </>
          ) : (
            <Text style={styles.emptyHint}>请先录入体重</Text>
          )}
        </Card>

        {/* 录入 */}
        <Card>
          <Text style={styles.cardTitle}>录入体重</Text>
          <TextField
            label="体重（kg）"
            value={input}
            onChangeText={setInput}
            placeholder="例如 70.5"
            keyboardType="numeric"
          />
          <Button title="保存" onPress={handleSave} />
        </Card>

        {/* 历史 */}
        <Card>
          <Text style={styles.cardTitle}>历史记录</Text>
          {weights.length === 0 ? (
            <Text style={styles.emptyHint}>暂无记录</Text>
          ) : (
            weights.map((w) => (
              <Row
                key={w.id}
                left={
                  <View>
                    <Text style={styles.weightValue}>{w.weight_kg.toFixed(1)} kg</Text>
                    <Text style={styles.dateText}>{w.recorded_at}</Text>
                  </View>
                }
                right={
                  <Pressable onPress={() => handleDelete(w.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.sell} />
                  </Pressable>
                }
              />
            ))
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
  note: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
