// 轻提示 Toast：Animated 淡入淡出 + 1.8s 自动消失（非阻塞反馈，替代系统 Alert）
// useToast() 返回状态与触发函数，<Toast> 负责渲染（position absolute，需在页面根容器内）

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

import { radius, spacing, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export function useToast(): {
  toast: string;
  toastOpacity: Animated.Value;
  showToast: (msg: string) => void;
} {
  const [toast, setToast] = useState('');
  // Animated.Value 用 useState 惰性初始化，规避 render 期访问 ref
  const [toastOpacity] = useState(() => new Animated.Value(0));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(''));
      }, 1800);
    },
    [toastOpacity]
  );

  return { toast, toastOpacity, showToast };
}

export default function Toast({
  message,
  opacity,
}: {
  message: string;
  opacity: Animated.Value;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!message) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText} maxFontSizeMultiplier={1.4}>
        {message}
      </Text>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      bottom: 96,
      alignSelf: 'center',
      backgroundColor: colors.text,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    toastText: {
      color: colors.bg,
      fontSize: 13,
      fontWeight: '600',
    },
  });
