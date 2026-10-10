// 设置：调整系数与宏量比例

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField } from '../components/ui';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import type { AppConfig } from '../types';

interface RatioPreset {
  label: string;
  desc: string;
  carb: number;
  protein: number;
  fat: number;
}

const PRESETS: RatioPreset[] = [
  { label: '均衡', desc: '有运动，日常健康', carb: 0.5, protein: 0.25, fat: 0.25 },
  { label: '减脂', desc: '低碳高蛋白', carb: 0.35, protein: 0.3, fat: 0.35 },
  { label: '增肌', desc: '高碳水供能', carb: 0.55, protein: 0.28, fat: 0.17 },
  { label: '控糖', desc: '低 GI 友好', carb: 0.4, protein: 0.3, fat: 0.3 },
  { label: '生酮', desc: '极低碳水', carb: 0.08, protein: 0.22, fat: 0.7 },
];

export default function SettingsScreen() {
  const { config, saveAndRefreshConfig } = useApp();
  const [kcalPerKg, setKcalPerKg] = useState('');
  const [proteinPerKg, setProteinPerKg] = useState('');
  const [carbRatio, setCarbRatio] = useState('');
  const [proteinRatio, setProteinRatio] = useState('');
  const [fatRatio, setFatRatio] = useState('');

  useEffect(() => {
    if (config) {
      setKcalPerKg(String(config.kcal_per_kg));
      setProteinPerKg(String(config.protein_per_kg));
      setCarbRatio(String(config.carb_ratio));
      setProteinRatio(String(config.protein_ratio));
      setFatRatio(String(config.fat_ratio));
    }
  }, [config]);

  async function handleSave() {
    const cfg: AppConfig = {
      kcal_per_kg: Number(kcalPerKg),
      protein_per_kg: Number(proteinPerKg),
      carb_ratio: Number(carbRatio),
      protein_ratio: Number(proteinRatio),
      fat_ratio: Number(fatRatio),
    };
    try {
      await saveAndRefreshConfig(cfg);
      Alert.alert('保存成功', '配置已更新，其他页面数据已联动刷新');
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  const ratioSum = Number(carbRatio) + Number(proteinRatio) + Number(fatRatio);

  async function applyPreset(p: RatioPreset) {
    setCarbRatio(String(p.carb));
    setProteinRatio(String(p.protein));
    setFatRatio(String(p.fat));
    // 立即保存并刷新全局 config，让其他 Tab 联动更新
    if (config) {
      try {
        await saveAndRefreshConfig({
          ...config,
          carb_ratio: p.carb,
          protein_ratio: p.protein,
          fat_ratio: p.fat,
        });
      } catch (e: any) {
        Alert.alert('预设应用失败', e?.message ?? '请手动检查比例');
      }
    }
  }

  function ratioApproxEqual(a: number, b: number) {
    return Math.abs(a - b) < 0.001;
  }

  const activePreset = PRESETS.find(
    (p) =>
      ratioApproxEqual(p.carb, Number(carbRatio)) &&
      ratioApproxEqual(p.protein, Number(proteinRatio)) &&
      ratioApproxEqual(p.fat, Number(fatRatio))
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.cardTitle}>热量与蛋白质系数</Text>
          <TextField
            label="每公斤热量 (kcal/kg)"
            value={kcalPerKg}
            onChangeText={setKcalPerKg}
            keyboardType="numeric"
          />
          <TextField
            label="每公斤蛋白质 (g/kg)"
            value={proteinPerKg}
            onChangeText={setProteinPerKg}
            keyboardType="numeric"
          />
          <Text style={styles.note}>
            每日热量 = 最新体重 × kcal/kg{'\n'}
            每日蛋白质 = 最新体重 × g/kg
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>宏量比例（总和必须等于 1）</Text>
          <Text style={styles.presetLabel}>快速预设</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {PRESETS.map((p) => {
              const isActive = activePreset?.label === p.label;
              return (
                <Pressable
                  key={p.label}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => applyPreset(p)}
                >
                  <Text style={[styles.presetLabelText, isActive && styles.presetLabelTextActive]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.presetDescText, isActive && styles.presetDescTextActive]}>
                    {p.desc}
                  </Text>
                  <Text style={[styles.presetRatioText, isActive && styles.presetLabelTextActive]}>
                    {Math.round(p.carb * 100)}/{Math.round(p.protein * 100)}/{Math.round(p.fat * 100)}
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
            碳水 g = 热量 × 碳水比例 ÷ 4{'\n'}
            蛋白 g = 热量 × 蛋白比例 ÷ 4{'\n'}
            脂肪 g = 热量 × 脂肪比例 ÷ 9
          </Text>
        </Card>

        <Button title="保存配置" onPress={handleSave} />
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
  note: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  ratioHint: {
    fontSize: 13,
    color: colors.ok,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  ratioHintError: {
    color: colors.sell,
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
  presetChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  presetLabelTextActive: {
    color: '#ffffff',
  },
  presetDescText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  presetDescTextActive: {
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
});
