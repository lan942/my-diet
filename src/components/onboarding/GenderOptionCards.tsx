// 性别选项卡列表（受控组件）：首启引导第 3 步与「我的」Biological Sex 编辑抽屉共用

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing } from '../../theme';
import { t, type TranslationKey } from '../../i18n';
import type { Gender } from '../../types';

const GENDER_OPTIONS: {
  value: Gender;
  label: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  desc: TranslationKey;
  chipBg: string;
  iconColor: string;
}[] = [
  { value: 'male', label: 'gender.male', icon: 'man-outline', desc: 'onboarding.genderMaleDesc', chipBg: '#34785b18', iconColor: '#34785b' },
  { value: 'female', label: 'gender.female', icon: 'woman-outline', desc: 'onboarding.genderFemaleDesc', chipBg: '#E8796418', iconColor: '#B9503D' },
  { value: 'unknown', label: 'gender.unknown', icon: 'help-circle-outline', desc: 'onboarding.genderUnknownDesc', chipBg: '#68766d18', iconColor: '#68766d' },
];

interface GenderOptionCardsProps {
  value: Gender;
  onChange: (g: Gender) => void;
}

export default function GenderOptionCards({ value, onChange }: GenderOptionCardsProps) {
  return (
    <View>
      {GENDER_OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            style={[styles.genderCard, active && styles.cardActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
          >
            <View style={[styles.genderChip, { backgroundColor: o.chipBg }]}>
              <Ionicons name={o.icon} size={22} color={o.iconColor} />
            </View>
            <View style={styles.genderBody}>
              <Text style={styles.genderLabel} maxFontSizeMultiplier={1.4}>
                {t(o.label)}
              </Text>
              <Text style={styles.genderDesc} maxFontSizeMultiplier={1.4}>
                {t(o.desc)}
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
  genderCard: {
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
  genderChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  genderDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
