import { useEffect, useId, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { palette } from '../constants/tokens';

const AnimatedView = Animated.View;

type Props = {
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
};

/**
 * Passenger control with a slow-rotating shiny gradient ring.
 */
export function GlowingPaxButton({
  onPress,
  size = 44,
  accessibilityLabel = 'Travellers',
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const gradId = `paxShine-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ring = size;
  const r = (size - 3) / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={[styles.hit, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
        <AnimatedView
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate }] },
          ]}
          pointerEvents="none"
        >
          <Svg width={ring} height={ring}>
            <Defs>
              <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={palette.primary400} stopOpacity="0.95" />
                <Stop offset="28%" stopColor={palette.primary200} stopOpacity="0.2" />
                <Stop offset="55%" stopColor={palette.primary100} stopOpacity="0.05" />
                <Stop offset="78%" stopColor={palette.primary300} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={palette.primary500} stopOpacity="0.85" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={`url(#${gradId})`}
              strokeWidth={1.6}
              fill="none"
            />
          </Svg>
        </AnimatedView>
        <Feather name="user" size={18} color={palette.primary500} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
});
