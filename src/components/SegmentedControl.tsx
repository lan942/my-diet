// iOS 风格分段选择器：滑动滑块高亮，用于单位切换等二/三选一场景

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { cardShadow, colors, radius } from '../theme';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Text
              style={[styles.text, active && styles.textActive]}
              maxFontSizeMultiplier={1.4}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.line,
    borderRadius: radius.sm,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: colors.card,
    ...cardShadow,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  textActive: {
    color: colors.text,
  },
});
