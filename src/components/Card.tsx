// 通用卡片容器

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { cardShadowLight, radius, spacing, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, style, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: spacing.md,
      // 深色下阴影不可见，描边即可
      ...(isDark ? {} : cardShadowLight),
    },
  });
