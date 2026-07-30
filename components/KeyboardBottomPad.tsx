import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardLift } from '../hooks/useKeyboardLift';

/**
 * Pads its bottom so children (sticky CTAs / search fields) sit above the
 * keyboard. When the keyboard is closed, uses the safe-area inset (unless
 * `includeSafeArea` is false).
 */
export function KeyboardBottomPad({
  children,
  style,
  includeSafeArea = true,
  extra = 0,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  includeSafeArea?: boolean;
  extra?: number;
}) {
  const insets = useSafeAreaInsets();
  const lift = useKeyboardLift();
  const pad =
    lift > 0 ? lift + extra : (includeSafeArea ? insets.bottom : 0) + extra;

  return <View style={[styles.wrap, { paddingBottom: pad }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
});
