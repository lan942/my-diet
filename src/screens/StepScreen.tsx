// 步数页：录入当日步数、消耗估算、历史列表

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
import { Button, TextField, Row, EmptyState } from '../components/ui';
import DateBar from '../components/DateBar';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { getStepByDate, stepsToKcal, upsertStep } from '../services/stepService';

export default function StepScreen() {
  const { stepLogs, currentDate, setCurrentDate, refresh } = useApp();
  const [input, setInput] = useState('');
  const [todaySteps, setTodaySteps] = useState<number | null>(null);

  useEffect(() => {
    getStepByDate(currentDate)
      .then((s) => {
        setTodaySteps(s?.steps ?? null);
        setInput(s ? String(s.steps) : '');
      })
      .catch(() => {});
  }, [currentDate, stepLogs]);

  async function handleSave() {
    const n = Number(input);
    if (!isFinite(n) || n < 0) {
      Alert.alert('错误', '步数必须为非负数');
      return;
    }
    try {
      await upsertStep(currentDate, Math.round(n));
      await refresh();
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '保存失败');
    }
  }

  const steps = todaySteps ?? 0;
  const kcal = stepsToKcal(steps);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateBar date={currentDate} onChange={setCurrentDate} />

        {/* 今日步数 */}
        <Card>
          <Text style={styles.cardTitle}>今日步数</Text>
          <View style={styles.stepsWrap}>
            <Text style={styles.stepsValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.stepsUnit}>步</Text>
          </View>
          <Text style={styles.kcalHint}>≈ 消耗 {kcal.toFixed(0)} kcal</Text>
        </Card>

        {/* 录入 */}
        <Card>
          <Text style={styles.cardTitle}>录入步数</Text>
          <TextField
            label="步数"
            value={input}
            onChangeText={setInput}
            placeholder="例如 8000"
            keyboardType="numeric"
          />
          <Button title="保存（覆盖当天）" onPress={handleSave} />
        </Card>

        {/* 历史 */}
        <Card>
          <Text style={styles.cardTitle}>历史记录</Text>
          {stepLogs.length === 0 ? (
            <EmptyState text="暂无步数记录" />
          ) : (
            stepLogs.map((s) => (
              <Row
                key={s.id}
                left={
                  <View>
                    <Text style={styles.dateText}>{s.date}</Text>
                    <Text style={styles.kcalSub}>≈ {stepsToKcal(s.steps).toFixed(0)} kcal</Text>
                  </View>
                }
                right={
                  <Text style={styles.stepsInline}>{s.steps.toLocaleString()}</Text>
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
  stepsWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  stepsValue: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.accent,
  },
  stepsUnit: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  kcalHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  kcalSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  stepsInline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
