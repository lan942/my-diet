// 日期切换条

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

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
  if (isToday(date)) return '今天';
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  );
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function DateBar({ date, onChange }: DateBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={() => onChange(shift(date, -1))} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.accent} />
      </Pressable>
      <Text style={styles.label}>{friendly(date)}</Text>
      <Pressable onPress={() => onChange(shift(date, 1))} hitSlop={8}>
        <Ionicons name="chevron-forward" size={22} color={colors.accent} />
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: spacing.md,
  },
});
