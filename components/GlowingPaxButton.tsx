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

const ROTATE_MS = 2800;
const FADE_MS = 280;
const PAUSE_MS = 1600;

/**
 * Passenger control — glow rotates once, then rests flat before the next pulse.
 * Press scales down for a tactile push.
 */
export function GlowingPaxButton({
  onPress,
  size = 44,
  accessibilityLabel = 'Travellers',
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const gradId = `paxShine-${useId().replace(/:/g, '')}`;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let handle: { stop: () => void } | null = null;

    const runCycle = () => {
      if (!alive.current) return;

      spin.setValue(0);
      glow.setValue(1);

      const anim = Animated.sequence([
        // One full rotation while glowing
        Animated.timing(spin, {
          toValue: 1,
          duration: ROTATE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Hide glow — button rests flat
        Animated.timing(glow, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Pause flat
        Animated.delay(PAUSE_MS),
        // Softly bring glow back before the next spin
        Animated.timing(glow, {
          toValue: 1,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      handle = anim;
      anim.start(({ finished }) => {
        if (finished && alive.current) runCycle();
      });
    };

    runCycle();
    return () => {
      alive.current = false;
      handle?.stop();
    };
  }, [spin, glow]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.86,
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

  const ring = size;
  const r = (size - 3) / 2;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={[styles.hit, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <AnimatedView
        style={[
          styles.face,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }],
          },
        ]}
      >
        <AnimatedView
          style={[
            StyleSheet.absoluteFill,
            { opacity: glow, transform: [{ rotate }] },
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
      </AnimatedView>
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
