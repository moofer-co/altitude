import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { palette, spacing, radii, shadows } from '../../constants/tokens';
import { useKeyboardLift } from '../../hooks/useKeyboardLift';

const { height: SH } = Dimensions.get('window');
const HPAD = spacing.lg;

/**
 * Bottom sheet with drag-to-dismiss.
 *
 * Keyboard: overlay gets paddingBottom = keyboard height so the whole sheet
 * (including footer CTA) sits above the keyboard. Avoids mixing native-driver
 * transforms with marginBottom on the same Animated.View.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  heightRatio = 0.86,
  headerAccessory,
  footer,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  heightRatio?: number;
  headerAccessory?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const keyboardLift = useKeyboardLift();
  const height = SH * heightRatio;
  const translateY = useRef(new Animated.Value(height)).current;

  const sheetHeight = Math.min(
    height + insets.bottom,
    Math.max(280, SH - keyboardLift),
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 62,
        friction: 11,
      }).start();
    } else {
      translateY.setValue(height);
    }
  }, [visible, translateY, height]);

  // Reset keyboard pad when sheet closes
  useEffect(() => {
    if (!visible) {
      // no-op — lift clears via keyboard hide; blur inputs on close
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, height, onClose]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > height * 0.3 || g.vy > 0.8) dismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 62,
            friction: 11,
          }).start();
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            s.overlayInner,
            // Android: pad the overlay so the sheet clears the keyboard
            Platform.OS === 'android' && keyboardLift > 0
              ? { paddingBottom: keyboardLift }
              : null,
          ]}
        >
          <Pressable style={s.backdrop} onPress={dismiss} />

          <Animated.View
            style={[
              s.sheet,
              {
                height: sheetHeight,
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...pan.panHandlers} style={s.head}>
              <View style={s.handle} />
              <View style={s.headRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="h2">{title}</Text>
                  {subtitle && (
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                <Pressable style={s.close} onPress={dismiss} hitSlop={8}>
                  <Feather name="x" size={19} color={palette.gray600} />
                </Pressable>
              </View>
              {headerAccessory}
            </View>

            <View style={{ flex: 1 }}>{children}</View>

            {footer && (
              <View
                style={[
                  s.footer,
                  {
                    paddingBottom:
                      keyboardLift > 0 ? spacing.md : insets.bottom + spacing.md,
                  },
                ]}
              >
                {footer}
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1 },
  overlayInner: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.sheet,
  },
  head: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: HPAD,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    backgroundColor: palette.white,
  },
});
