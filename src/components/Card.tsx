// 通用卡片容器

import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { cardShadow, colors, radius, spacing } from '../theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
    ...cardShadow,
  },
});
