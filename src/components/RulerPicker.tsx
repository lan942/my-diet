// 水平刻度尺选择器：拖动选值，逐格触觉反馈，程序化滚动（单位切换）不误触发回调

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TICK_W = 12;

interface RulerPickerProps {
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

export default function RulerPicker({
  min,
  max,
  step,
  value,
  unit,
  icon,
  onChange,
  formatValue,
}: RulerPickerProps) {
  const { width: screenW } = useWindowDimensions();
  const count = Math.round((max - min) / step) + 1;
  const scrollRef = useRef<ScrollView>(null);
  const lastXRef = useRef(0);
  const suppressRef = useRef(false);
  const suppressXRef = useRef(0);
  const selfChangeRef = useRef(false);
  const lastValueRef = useRef(value);

  const xForValue = (v: number) => ((v - min) / step) * TICK_W;
  const valueAtX = (x: number) => {
    const idx = Math.max(0, Math.min(count - 1, Math.round(x / TICK_W)));
    return Math.round((min + idx * step) * 100) / 100;
  };

  // 外部值变化（初始化/单位切换）→ 程序化滚动，期间抑制 onChange；
  // 自己 onChange 引发的 value 更新则跳过，避免与用户手指对抗
  useEffect(() => {
    if (selfChangeRef.current) {
      selfChangeRef.current = false;
      return;
    }
    const x = xForValue(value);
    if (Math.abs(x - lastXRef.current) > 0.5) {
      suppressRef.current = true;
      suppressXRef.current = x;
      scrollRef.current?.scrollTo({ x, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, step]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    lastXRef.current = x;
    if (suppressRef.current) {
      if (Math.abs(x - suppressXRef.current) < 1) suppressRef.current = false;
      return;
    }
    const v = valueAtX(x);
    if (v !== lastValueRef.current) {
      lastValueRef.current = v;
      selfChangeRef.current = true;
      Haptics.selectionAsync().catch(() => {});
      onChange(v);
    }
  }

  const ticks = Array.from({ length: count }, (_, i) => {
    const line = i % 10 === 0 ? styles.tickMajor : i % 5 === 0 ? styles.tickMid : styles.tickMinor;
    return (
      <View key={i} style={styles.tick}>
        <View style={line} />
      </View>
    );
  });

  const display = formatValue ? formatValue(value) : `${value}`;

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        {icon ? (
          <View style={styles.iconChip}>
            <Ionicons name={icon} size={15} color="#2563eb" />
          </View>
        ) : null}
        <Text style={styles.valueText}>
          {display}
          <Text style={styles.unitText}> {unit}</Text>
        </Text>
      </View>
      <View style={styles.rulerWrap}>
        <View style={styles.pin} />
        <ScrollView
          ref={scrollRef}
          horizontal
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_W}
          decelerationRate="fast"
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            // 用户接管手势，解除程序化滚动的抑制
            suppressRef.current = false;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: (screenW - TICK_W) / 2,
            alignItems: 'flex-end',
          }}
        >
          {ticks}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2563eb14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  rulerWrap: {
    height: 48,
    justifyContent: 'flex-end',
  },
  pin: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: '#2563eb',
    borderRadius: 1,
  },
  tick: {
    width: TICK_W,
    alignItems: 'center',
  },
  tickMajor: {
    width: 2,
    height: 32,
    backgroundColor: '#9ca3af',
    borderRadius: 1,
  },
  tickMid: {
    width: 1.5,
    height: 22,
    backgroundColor: '#c7ccd4',
    borderRadius: 1,
  },
  tickMinor: {
    width: 1,
    height: 14,
    backgroundColor: '#e3e6ea',
    borderRadius: 1,
  },
});
