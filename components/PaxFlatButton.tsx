import { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing } from '../constants/tokens';
import { shortPax, type PaxMix } from '../lib/flightRules';

/**
 * Flat travellers control (no chip) — user icon + count, with press-down feedback.
 */
export function PaxFlatButton({
  pax,
  onPress,
}: {
  pax: PaxMix;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      tension: 280,
      friction: 14,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 220,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Travellers, ${shortPax(pax)}. Edit`}
    >
      <Animated.View style={[s.row, { transform: [{ scale }] }]}>
        <Feather name="user" size={15} color={palette.gray700} />
        <Text variant="caption" style={s.label}>
          {shortPax(pax)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  label: {
    fontWeight: '600',
    color: palette.gray800,
  },
});
