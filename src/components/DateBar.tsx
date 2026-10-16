// 日期切换条

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { t, formatDateShort } from '../i18n';

interface DateBarProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

function shift(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isToday(date: string): boolean {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return date === today;
}

function friendly(date: string): string {
  if (isToday(date)) return t('common.today');
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  );
  if (diff === 1) return t('common.yesterday');
  if (diff === 2) return t('common.dayBeforeYesterday');
  return formatDateShort(date);
}

export default function DateBar({ date, onChange }: DateBarProps) {
  // 不允许进入未来日期（摄入/步数均按所选日期落库）
  const atToday = isToday(date);
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => onChange(shift(date, -1))}
        accessibilityRole="button"
        accessibilityLabel={t('date.previous')}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.accent} />
      </Pressable>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        {friendly(date)}
      </Text>
      <Pressable
        onPress={() => {
          if (!atToday) onChange(shift(date, 1));
        }}
        hitSlop={8}
        disabled={atToday}
        accessibilityRole="button"
        accessibilityLabel={t('date.next')}
        accessibilityState={{ disabled: atToday }}
        style={({ pressed }) => [styles.arrowButton, pressed && !atToday && styles.arrowPressed]}
      >
        <Ionicons
          name="chevron-forward"
          size={22}
          color={atToday ? colors.muted : colors.accent}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  arrowButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.card,
  },
  arrowPressed: {
    opacity: 0.65,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: spacing.md,
  },
});
