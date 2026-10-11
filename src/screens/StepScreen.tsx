// 步数页：录入当日步数、消耗估算、历史列表

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { Button, TextField, Row, EmptyState } from '../components/ui';
import Toast, { useToast } from '../components/Toast';
import DateBar from '../components/DateBar';
import { colors, spacing } from '../theme';
import { useApp } from '../state/AppContext';
import { formatDateShort, formatNumber, t, tError } from '../i18n';
import { getStepByDate, stepsToKcal, syncPlatformSteps, upsertStep } from '../services/stepService';
import { todayString } from '../db/database';
import { platformSteps, type PlatformStepsAvailability } from '../services/platformSteps';

export default function StepScreen() {
  const { stepLogs, currentDate, setCurrentDate, refresh } = useApp();
  const [input, setInput] = useState('');
  const [formError, setFormError] = useState('');
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [syncAvail, setSyncAvail] = useState<PlatformStepsAvailability>('unavailable');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const { toast, toastOpacity, showToast } = useToast();

  useEffect(() => {
    getStepByDate(currentDate)
      .then((s) => {
        setTodaySteps(s?.steps ?? null);
        setInput(s ? String(s.steps) : '');
      })
      .catch(() => {});
  }, [currentDate, stepLogs]);

  // 健康平台可用性探测（不触发权限弹窗）
  useEffect(() => {
    platformSteps
      .availability()
      .then(setSyncAvail)
      .catch(() => setSyncAvail('unavailable'));
  }, []);

  // 同步入口：用户主动触发 → 运行时请求权限 → 读取当日步数写入
  // 降级：平台不可用 / 拒绝授权 / 读取失败均给出本地反馈
  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncError('');
    try {
      const avail = await platformSteps.availability();
      if (avail !== 'available') {
        setSyncError(t('sync.unavailable'));
        return;
      }
      const granted = await platformSteps.requestPermissions();
      if (!granted) {
        setSyncError(t('sync.denied'));
        return;
      }
      const read = await platformSteps.readTodaySteps();
      if (read === null) {
        setSyncError(t('sync.unavailable'));
        return;
      }
      const result = await syncPlatformSteps(todayString(), read);
      if (result === null) {
        showToast(t('sync.protected'));
      } else {
        showToast(t('sync.success', { steps: formatNumber(result.steps) }));
      }
      await refresh();
    } catch {
      setSyncError(t('sync.unavailable'));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave() {
    setFormError('');
    const n = Number(input);
    if (!isFinite(n) || n < 0) {
      setFormError(t('error.ERR_INVALID_STEPS'));
      return;
    }
    try {
      await upsertStep(currentDate, Math.round(n));
      await refresh();
    } catch (e: unknown) {
      setFormError(tError(e));
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
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('steps.today')}
          </Text>
          <View style={styles.stepsWrap}>
            <Text style={styles.stepsValue} maxFontSizeMultiplier={2}>
              {formatNumber(steps)}
            </Text>
            <Text style={styles.stepsUnit} maxFontSizeMultiplier={1.4}>
              {t('steps.unit')}
            </Text>
          </View>
          <Text style={styles.kcalHint} maxFontSizeMultiplier={1.4}>
            {t('steps.kcalHint', { kcal: kcal.toFixed(0) })}
          </Text>
          {syncAvail !== 'unavailable' ? (
            <View style={styles.syncBox}>
              <Text style={styles.syncRationale} maxFontSizeMultiplier={1.4}>
                {t('sync.rationale')}
              </Text>
              <Button
                title={syncing ? t('onboarding.saving') : t('sync.button')}
                variant="ghost"
                onPress={handleSync}
                disabled={syncing}
              />
              {syncError ? (
                <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
                  {syncError}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        {/* 录入 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('steps.inputTitle')}
          </Text>
          <TextField
            label={t('steps.label')}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setFormError('');
            }}
            placeholder={t('steps.labelPh')}
            keyboardType="numeric"
          />
          {formError ? (
            <Text style={styles.formError} maxFontSizeMultiplier={1.4}>
              {formError}
            </Text>
          ) : null}
          <Button title={t('steps.saveOverwrite')} onPress={handleSave} />
        </Card>

        {/* 历史 */}
        <Card>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.4}>
            {t('steps.history')}
          </Text>
          {stepLogs.length === 0 ? (
            <EmptyState text={t('steps.empty')} />
          ) : (
            stepLogs.map((s) => (
              <Row
                key={s.id}
                left={
                  <View>
                    <Text style={styles.dateText} maxFontSizeMultiplier={1.4}>
                      {formatDateShort(s.date)}
                    </Text>
                    <Text style={styles.kcalSub} maxFontSizeMultiplier={1.4}>
                      ≈ {stepsToKcal(s.steps).toFixed(0)} kcal
                    </Text>
                  </View>
                }
                right={
                  <Text style={styles.stepsInline} maxFontSizeMultiplier={1.4}>
                    {formatNumber(s.steps)}
                  </Text>
                }
              />
            ))
          )}
        </Card>
      </ScrollView>

      {/* 轻提示（同步结果等非阻塞反馈） */}
      <Toast message={toast} opacity={toastOpacity} />
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
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
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
  syncBox: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncRationale: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
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
  formError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});
