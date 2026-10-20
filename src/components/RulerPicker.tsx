// 水平刻度尺选择器：拖动选值，逐格触觉反馈，程序化滚动（单位切换）不误触发回调

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';

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
  // 数值行直接编辑：提供后点击数值切换为数字键盘输入，失焦/提交时回调原始字符串
  // （校验与写回由父组件负责；本组件只管理编辑态与数字字符过滤）
  onValueInput?: (raw: string) => void;
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
  onValueInput,
}: RulerPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // 实测滚动容器自身宽度（刻度尺全部处在带 padding/maxWidth 的父容器内，
  // 用 useWindowDimensions 的屏宽会让两侧居中内边距系统性偏大、pin 与刻度错位）
  const [viewW, setViewW] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const sidePad = viewW > 0 ? (viewW - TICK_W) / 2 : 0;
  const count = Math.round((max - min) / step) + 1;
  const scrollRef = useRef<ScrollView>(null);
  const lastXRef = useRef(0);
  const suppressRef = useRef(false);
  const suppressXRef = useRef(0);
  const selfChangeRef = useRef(false);
  // 外部值越界（如单位切换后换算值超出本量程）时仅在尺内钳制显示，
  // 不主动 onChange 回写，避免污染父组件存储值
  const clampedValue = Math.max(min, Math.min(max, value));
  const lastValueRef = useRef(clampedValue);

  const xForValue = (v: number) => ((v - min) / step) * TICK_W;
  const valueAtX = (x: number) => {
    const idx = Math.max(0, Math.min(count - 1, Math.round(x / TICK_W)));
    return Math.round((min + idx * step) * 100) / 100;
  };

  // 外部值变化（初始化/单位切换）→ 程序化滚动，期间抑制 onChange；
  // 自己 onChange 引发的 value 更新则跳过，避免与用户手指对抗
  useEffect(() => {
    // 容器宽度未测得前不做程序化滚动（此时内边距与可滚范围均不正确）
    if (viewW === 0) return;
    if (selfChangeRef.current) {
      selfChangeRef.current = false;
      return;
    }
    const x = xForValue(clampedValue);
    if (Math.abs(x - lastXRef.current) > 0.5) {
      suppressRef.current = true;
      suppressXRef.current = x;
      scrollRef.current?.scrollTo({ x, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, clampedValue, min, max, step, viewW]);

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - viewW) > 0.5) setViewW(w);
  }

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

  const display = formatValue ? formatValue(clampedValue) : `${clampedValue}`;

  // 编辑文本最新值用 ref 同步：点击 Add to Today 时 onPress 先于 onBlur 触发，
  // commitEdit 若读 state 闭包会拿到旧值，导致手动输入的克数丢失（写回编辑前值）
  const editTextRef = useRef('');
  // done 键会先触发 onSubmitEditing 再触发 onBlur，用已提交标记保证只回调一次
  const committedRef = useRef(false);

  // 进入直接编辑：预填当前值，数字键盘（快速记录场景避免弹全键盘）
  function startEdit() {
    committedRef.current = false;
    editTextRef.current = String(value);
    setEditText(editTextRef.current);
    setEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  // 提交编辑：无论是否合法都退出编辑态，合法性交由父组件校验（非法时父组件回退显示值）
  function commitEdit() {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    onValueInput?.(editTextRef.current);
  }

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        {icon ? (
          <View style={styles.iconChip}>
            <Ionicons name={icon} size={15} color={colors.accent} />
          </View>
        ) : null}
        {onValueInput && editing ? (
          <TextInput
            style={styles.valueInput}
            value={editText}
            onChangeText={(s) => {
              const digits = s.replace(/[^0-9]/g, '');
              editTextRef.current = digits;
              setEditText(digits);
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            autoFocus
            selectTextOnFocus
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            maxLength={7}
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel={unit}
          />
        ) : (
          <Pressable
            onPress={onValueInput ? startEdit : undefined}
            disabled={!onValueInput}
            accessibilityRole={onValueInput ? 'button' : 'text'}
          >
            <Text style={styles.valueText} maxFontSizeMultiplier={2}>
              {display}
              <Text style={styles.unitText} maxFontSizeMultiplier={1.4}>
                {' '}
                {unit}
              </Text>
            </Text>
          </Pressable>
        )}
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
          onLayout={handleLayout}
          onScrollBeginDrag={() => {
            // 用户接管手势，解除程序化滚动的抑制
            suppressRef.current = false;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: sidePad,
            alignItems: 'flex-end',
          }}
        >
          {ticks}
        </ScrollView>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
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
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueText: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    // 直接编辑输入框：与 valueText 同字号字重，仅加底线提示可编辑
    valueInput: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      minWidth: 96,
      paddingVertical: 0,
      paddingHorizontal: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.accent,
    },
    unitText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
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
      backgroundColor: colors.accent,
      borderRadius: 1,
    },
    tick: {
      width: TICK_W,
      alignItems: 'center',
    },
    tickMajor: {
      width: 2,
      height: 32,
      backgroundColor: colors.muted,
      borderRadius: 1,
    },
    tickMid: {
      width: 1.5,
      height: 22,
      backgroundColor: colors.line,
      borderRadius: 1,
    },
    tickMinor: {
      width: 1,
      height: 14,
      backgroundColor: colors.line,
      borderRadius: 1,
      opacity: 0.6,
    },
  });
