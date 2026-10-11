// 身体参数刻度尺组（受控组件）：首启引导第 2 步与「我的」Body Metrics 编辑抽屉共用
// 内聚单位切换与公/美制换算显示；持久化值始终为 cm/kg

import React from 'react';
import { View, StyleSheet } from 'react-native';

import RulerPicker from '../RulerPicker';
import SegmentedControl from '../SegmentedControl';
import { spacing } from '../../theme';
import { t } from '../../i18n';
import {
  kgToLb,
  lbToKg,
  ftInLabel,
  cmToInSnap,
  inToCm,
} from '../../services/unit';
import type { UnitSystem } from '../../types';

interface BodyMetricsRulersProps {
  age: number;
  heightCm: number;
  weightKg: number;
  unit: UnitSystem;
  onAge: (v: number) => void;
  onHeightCm: (v: number) => void;
  onWeightKg: (v: number) => void;
  onUnit: (u: UnitSystem) => void;
}

export default function BodyMetricsRulers({
  age,
  heightCm,
  weightKg,
  unit,
  onAge,
  onHeightCm,
  onWeightKg,
  onUnit,
}: BodyMetricsRulersProps) {
  return (
    <View>
      <SegmentedControl<UnitSystem>
        options={[
          { label: t('unit.metric'), value: 'metric' },
          { label: t('unit.us'), value: 'us' },
        ]}
        value={unit}
        onChange={onUnit}
      />
      <View style={styles.rulerGroup}>
        <RulerPicker
          min={1}
          max={120}
          step={1}
          value={age}
          unit={t('unit.age')}
          icon="calendar-outline"
          onChange={onAge}
        />
        <RulerPicker
          min={unit === 'metric' ? 100 : 40}
          max={unit === 'metric' ? 250 : 98}
          step={unit === 'metric' ? 1 : 0.5}
          value={unit === 'metric' ? heightCm : cmToInSnap(heightCm)}
          unit={unit === 'metric' ? t('unit.cm') : t('unit.in')}
          icon="body-outline"
          onChange={(v) => onHeightCm(unit === 'metric' ? v : inToCm(v))}
          formatValue={(v) =>
            unit === 'metric'
              ? `${v}`
              : t('unit.ftInFormat', { label: ftInLabel(v), inches: v.toFixed(1) })
          }
        />
        <RulerPicker
          min={unit === 'metric' ? 30 : 66}
          max={unit === 'metric' ? 200 : 440}
          step={unit === 'metric' ? 0.5 : 1}
          value={unit === 'metric' ? weightKg : Math.round(kgToLb(weightKg))}
          unit={unit === 'metric' ? t('unit.kg') : t('unit.lb')}
          icon="speedometer-outline"
          onChange={(v) => onWeightKg(unit === 'metric' ? v : lbToKg(v))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rulerGroup: {
    marginTop: spacing.lg,
  },
});
