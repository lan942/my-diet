// 目标模板卡列表（受控组件）：首启引导第 1 步与「我的」Goal 编辑抽屉共用

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, macroColors, cardShadow } from '../../theme';
import { t } from '../../i18n';
import { GOAL_PRESETS, type GoalPreset } from '../../services/targetService';

interface GoalPresetCardsProps {
  value: GoalPreset | null;
  onChange: (p: GoalPreset) => void;
}

export default function GoalPresetCards({ value, onChange }: GoalPresetCardsProps) {
  return (
    <View>
      {GOAL_PRESETS.map((p) => {
        const active = value?.label === p.label;
        return (
          <Pressable
            key={p.label}
            style={[
              styles.goalCard,
              cardShadow,
              active && { borderColor: p.color, backgroundColor: p.color },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(p);
            }}
          >
            <View style={[styles.goalBar, { backgroundColor: active ? '#ffffff' : p.color }]} />
            <View style={styles.goalBody}>
              <Text style={[styles.goalLabel, active && styles.textOnColor]} maxFontSizeMultiplier={1.4}>
                {t(p.label)}
              </Text>
              <Text style={[styles.goalDesc, active && styles.textOnColorSoft]} maxFontSizeMultiplier={1.4}>
                {t(p.desc)}
              </Text>
              <View style={styles.ratioRow}>
                <Text
                  style={[
                    styles.ratioText,
                    active ? styles.textOnColor : { color: macroColors.protein },
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('macro.protein')} {Math.round(p.protein * 100)}%
                </Text>
                <Text
                  style={[
                    styles.ratioText,
                    active ? styles.textOnColor : { color: macroColors.fat },
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('macro.fat')} {Math.round(p.fat * 100)}%
                </Text>
                <Text
                  style={[
                    styles.ratioText,
                    active ? styles.textOnColor : { color: macroColors.carb },
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('macro.carb')} {Math.round(p.carb * 100)}%
                </Text>
              </View>
            </View>
            {active ? (
              <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  goalBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  goalBody: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  goalDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  ratioRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  ratioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textOnColor: {
    color: '#ffffff',
  },
  textOnColorSoft: {
    color: 'rgba(255,255,255,0.85)',
  },
});
