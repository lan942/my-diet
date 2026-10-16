// 通用底部操作抽屉：选项选择（导出格式）与二次确认（导入/清空数据）
// 视觉与 EditSheet 一致：grabber + 居中标题 + 说明 + 选项行/主按钮 + 取消

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Button } from './ui';
import { colors, spacing } from '../theme';
import { t } from '../i18n';

export interface ActionSheetOption {
  key: string;
  label: string;
  sub?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: string;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  options?: ActionSheetOption[];
  confirmLabel?: string;
  confirmDanger?: boolean;
  onSelect?: (key: string) => void;
  onConfirm?: () => void;
  onClose: () => void;
}

const CLOSE_THRESHOLD = 120;

// 模块级工厂：手势实例只创建一次。关闭锁为工厂内部状态，
// 组件通过方法读写（useState initializer 内零 ref 捕获，满足 react-hooks 规则）
function createSheetPanResponder(translateY: Animated.Value, onClose: () => void) {
  let closing = false;
  const pr = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > CLOSE_THRESHOLD || g.vy > 1.2) {
        // 动画开始即锁定交互（此时选项仍在屏幕上约 180ms）
        closing = true;
        Animated.timing(translateY, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          translateY.setValue(0);
          onClose();
        });
      } else {
        // 回弹：未真正关闭，恢复可交互
        closing = false;
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });
  return {
    pr,
    isClosing: () => closing,
    setClosing: (v: boolean) => {
      closing = v;
    },
  };
}

export default function ActionSheet({
  visible,
  title,
  message,
  options,
  confirmLabel,
  confirmDanger,
  onSelect,
  onConfirm,
  onClose,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  // Animated.Value 与 PanResponder 为稳定实例，用 useState 惰性初始化（规避 render 期访问 ref）
  const [translateY] = useState(() => new Animated.Value(0));
  const [sheetPan] = useState(() => createSheetPanResponder(translateY, onClose));

  useEffect(() => {
    if (visible) {
      sheetPan.setClosing(false);
      translateY.setValue(0);
    }
  }, [visible, translateY, sheetPan]);

  // 统一关闭入口：首击生效，重复点按/动画窗口内触摸全部忽略
  function runClose(action?: () => void) {
    if (sheetPan.isClosing()) return;
    sheetPan.setClosing(true);
    onClose();
    action?.();
  }

  const panResponder = sheetPan.pr;

  function handleSelect(key: string) {
    Haptics.selectionAsync().catch(() => {});
    runClose(() => onSelect?.(key));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => runClose()}
    >
      <View style={styles.mask}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => runClose()} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: spacing.md + insets.bottom },
            { transform: [{ translateY }] },
          ]}
        >
          {/* 头部：下拉手势区 */}
          <View {...panResponder.panHandlers}>
            <View style={styles.grabber} />
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>
              {title}
            </Text>
            {message ? (
              <Text style={styles.message} maxFontSizeMultiplier={1.4}>
                {message}
              </Text>
            ) : null}
          </View>

          {options?.map((opt) => (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}
              onPress={() => handleSelect(opt.key)}
            >
              {opt.icon ? (
                <View
                  style={[styles.optionIcon, { backgroundColor: `${opt.tint ?? colors.accent}1F` }]}
                >
                  <Ionicons name={opt.icon} size={20} color={opt.tint ?? colors.accent} />
                </View>
              ) : null}
              <View style={styles.optionBody}>
                <Text style={styles.optionLabel} maxFontSizeMultiplier={1.4}>
                  {opt.label}
                </Text>
                {opt.sub ? (
                  <Text style={styles.optionSub} maxFontSizeMultiplier={1.4}>
                    {opt.sub}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}

          {confirmLabel ? (
            <View style={styles.confirmWrap}>
              <Button
                title={confirmLabel}
                variant={confirmDanger ? 'danger' : 'primary'}
                onPress={() => runClose(() => onConfirm?.())}
              />
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]}
            onPress={() => runClose()}
            hitSlop={8}
          >
            <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  confirmWrap: {
    marginTop: spacing.md,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
});
