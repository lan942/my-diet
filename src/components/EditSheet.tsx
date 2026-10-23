// 单步编辑抽屉（Bottom Sheet）：grabber + 标题 + 说明 + 内容 + Save
// 手势下拉关闭（作用于头部区域，不与内容 ScrollView 冲突）+ 遮罩点击关闭

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './ui';
import { spacing, type ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

interface EditSheetProps {
  visible: boolean;
  title: string;
  hint?: string;
  error?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

const CLOSE_THRESHOLD = 120;

export default function EditSheet({
  visible,
  title,
  hint,
  error,
  saving,
  onClose,
  onSave,
  children,
}: EditSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // Animated.Value 与 PanResponder 为稳定实例，用 useState 惰性初始化（规避 render 期访问 ref）
  const [translateY] = useState(() => new Animated.Value(0));

  // 关闭动画期间复位偏移，避免下次打开残留
  useEffect(() => {
    if (!visible) translateY.setValue(0);
  }, [visible, translateY]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_THRESHOLD || g.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mask}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* 键盘弹出时抬高抽屉：adjustResize 下窗口已压缩，KAV height/padding 均可正常工作 */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.avoid}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: spacing.xl + 8 + insets.bottom },
              { transform: [{ translateY }] },
            ]}
          >
          {/* 头部：下拉手势区 */}
          <View {...panResponder.panHandlers}>
            <View style={styles.grabber} />
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>
              {title}
            </Text>
            {hint ? (
              <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
                {hint}
              </Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bounces={false}
          >
            {children}
          </ScrollView>

          {error ? (
            <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
              {error}
            </Text>
          ) : null}
          <Button
            title={saving ? t('onboarding.saving') : t('common.save')}
            onPress={onSave}
            disabled={saving}
          />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  // 键盘避让容器：占满宽度让 sheet 底部锚定，box-none 放行遮罩点击关闭
  avoid: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    // maxHeight 相对 KAV 容器（adjustResize 下已含键盘压缩），100% 保证抽屉最多撑满可见区，
    // 内容区自然被压缩为可滚动状态，保存按钮恒在键盘上方
    maxHeight: '100%',
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
  hint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
