// 达成率进度条

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

function colorFor(ratio: number): string {
  if (ratio >= 1) return colors.ok;
  if (ratio >= 0.7) return colors.warn;
  return colors.danger;
}

export default function ProgressBar({
  label,
  current,
  target,
  unit = '',
}: ProgressBarProps) {
  const ratio = target > 0 ? current / target : 0;
  const clamped = Math.min(ratio, 1);
  const percent = Math.round(ratio * 100);
  const barColor = colorFor(ratio);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label} maxFontSizeMultiplier={1.4}>
          {label}
        </Text>
        <Text style={styles.value} maxFontSizeMultiplier={1.4}>
          {current.toFixed(1)}/{target.toFixed(1)}
          {unit} · {percent}%
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
  },
  value: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 1,
    textAlign: 'right',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
