// 活动强度行列表（受控组件）：首启引导第 4 步与「我的」Activity Level 编辑抽屉共用

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing } from '../../theme';
import { t } from '../../i18n';
import { ACTIVITY_LEVELS } from '../../services/targetService';

// 活动强度 5 档的渐进色：翡翠绿（低）→ 琥珀（中）→ 珊瑚红（高）
const LEVEL_COLORS = ['#10B981', '#10B981', '#F59E0B', '#F59E0B', '#FF6B4A'];

interface ActivityLevelRowsProps {
  value: number;
  onChange: (factor: number) => void;
}

export default function ActivityLevelRows({ value, onChange }: ActivityLevelRowsProps) {
  return (
    <View>
      {ACTIVITY_LEVELS.map((level, idx) => {
        const active = Math.abs(value - level.factor) < 0.001;
        const intensityColor = LEVEL_COLORS[idx] ?? colors.muted;
        return (
          <Pressable
            key={level.factor}
            style={[styles.levelRow, active && styles.cardActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(level.factor);
            }}
          >
            <View style={styles.levelBody}>
              <View style={styles.levelTitleRow}>
                <Text style={styles.levelLabel} maxFontSizeMultiplier={1.4}>
                  {t(level.label)} (×{level.factor})
                </Text>
                <View style={styles.dotsRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: i <= idx ? intensityColor : colors.line },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.levelDesc} maxFontSizeMultiplier={1.4}>
                {t(level.desc)}
              </Text>
            </View>
            {active ? (
              <Ionicons name="checkmark" size={20} color={colors.accent} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  levelBody: {
    flex: 1,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  levelDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
