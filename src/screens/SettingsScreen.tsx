// 设置：调整系数与宏量比例

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField } from '../components/ui';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { saveConfig } from '../services/configStore';
import type { AppConfig } from '../types';

export default function SettingsScreen() {
  const { config, refresh } = useApp();
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
      await saveConfig(cfg);
      await refresh();
      Alert.alert('保存成功', '配置已更新');
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  const ratioSum = Number(carbRatio) + Number(proteinRatio) + Number(fatRatio);

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
});
