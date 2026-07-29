import { useEffect, useId, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { Plane } from './ui';
import { palette } from '../constants/tokens';

const AnimatedView = Animated.View;

type TravelKind =
  | 'plane'
  | 'pin'
  | 'bag'
  | 'passport'
  | 'globe'
  | 'ticket'
  | 'compass'
  | 'sun';

type Bubble = {
  kind: TravelKind;
  /** Angle on the ring in degrees (0 = right, CCW). */
  angle: number;
  size: number;
  color: string;
  iconColor?: string;
  orbit: 'outer' | 'inner';
  delay: number;
};

const BUBBLES: Bubble[] = [
  {
    kind: 'passport',
    angle: -38,
    size: 54,
    color: palette.primary500,
    iconColor: palette.white,
    orbit: 'outer',
    delay: 140,
  },
  {
    kind: 'plane',
    angle: 32,
    size: 46,
    color: '#F59E0B',
    iconColor: palette.white,
    orbit: 'outer',
    delay: 280,
  },
  {
    kind: 'pin',
    angle: 128,
    size: 42,
    color: '#EC4899',
    iconColor: palette.white,
    orbit: 'outer',
    delay: 420,
  },
  {
    kind: 'globe',
    angle: 205,
    size: 48,
    color: '#16A34A',
    iconColor: palette.white,
    orbit: 'outer',
    delay: 560,
  },
  {
    kind: 'bag',
    angle: 255,
    size: 40,
    color: '#0D9488',
    iconColor: palette.white,
    orbit: 'inner',
    delay: 220,
  },
  {
    kind: 'ticket',
    angle: 58,
    size: 36,
    color: '#A78BFA',
    iconColor: palette.white,
    orbit: 'inner',
    delay: 360,
  },
  {
    kind: 'compass',
    angle: 165,
    size: 34,
    color: '#F472B6',
    iconColor: palette.white,
    orbit: 'inner',
    delay: 500,
  },
  {
    kind: 'sun',
    angle: 315,
    size: 30,
    color: '#FBBF24',
    iconColor: '#78350F',
    orbit: 'inner',
    delay: 640,
  },
];

function TravelIcon({
  kind,
  color,
  size,
}: {
  kind: TravelKind;
  color: string;
  size: number;
}) {
  const s = Math.round(size * 0.42);
  switch (kind) {
    case 'plane':
      return <Plane size={s} color={color} up />;
    case 'pin':
      return <Feather name="map-pin" size={s} color={color} />;
    case 'bag':
      return <Feather name="briefcase" size={s} color={color} />;
    case 'passport':
      return <Feather name="book" size={s} color={color} />;
    case 'globe':
      return <Feather name="globe" size={s} color={color} />;
    case 'ticket':
      return <Feather name="tag" size={s} color={color} />;
    case 'compass':
      return <Feather name="compass" size={s} color={color} />;
    case 'sun':
      return <Feather name="sun" size={s} color={color} />;
  }
}

function GlowRing({
  size,
  duration,
  reverse,
  strokeWidth = 2,
  soft,
}: {
  size: number;
  duration: number;
  reverse?: boolean;
  strokeWidth?: number;
  soft?: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const gradId = `orbitGlow-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, duration]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });

  const r = (size - strokeWidth) / 2;

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.ringWrap,
        { width: size, height: size, transform: [{ rotate }] },
      ]}
    >
      <View
        style={[
          styles.baseRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: soft ? palette.primary100 : palette.gray200,
          },
        ]}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.primary400} stopOpacity="0.95" />
            <Stop offset="22%" stopColor={palette.primary200} stopOpacity="0.15" />
            <Stop offset="48%" stopColor={palette.primary100} stopOpacity="0.02" />
            <Stop offset="72%" stopColor={palette.primary300} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={palette.primary500} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    </AnimatedView>
  );
}

function OrbitBubble({
  bubble,
  radius,
  stageSize,
  counterRotate,
}: {
  bubble: Bubble;
  radius: number;
  stageSize: number;
  counterRotate: Animated.AnimatedInterpolation<string>;
}) {
  const pop = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(bubble.delay),
      Animated.spring(pop, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 2400 + (bubble.delay % 400),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 2400 + (bubble.delay % 400),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => drift.start(), bubble.delay + 450);
    return () => {
      clearTimeout(t);
      drift.stop();
    };
  }, [bob, bubble.delay, pop]);

  const rad = (bubble.angle * Math.PI) / 180;
  const cx = stageSize / 2 + Math.cos(rad) * radius;
  const cy = stageSize / 2 + Math.sin(rad) * radius;

  const scale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 1],
  });
  const opacity = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const bobY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: bubble.size,
          height: bubble.size,
          borderRadius: bubble.size / 2,
          backgroundColor: bubble.color,
          left: cx - bubble.size / 2,
          top: cy - bubble.size / 2,
          opacity,
          transform: [{ translateY: bobY }, { rotate: counterRotate }, { scale }],
        },
      ]}
    >
      <TravelIcon
        kind={bubble.kind}
        color={bubble.iconColor ?? palette.white}
        size={bubble.size}
      />
    </AnimatedView>
  );
}

/**
 * Onboarding hero: user at the centre, glowing orbits, travel elements
 * popping into place — everything revolves around you.
 */
export function OnboardingOrbit({
  size = 300,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  const outer = size * 0.9;
  const inner = size * 0.6;
  const avatar = Math.round(size * 0.26);

  const outerBubbles = useMemo(
    () => BUBBLES.filter((b) => b.orbit === 'outer'),
    [],
  );
  const innerBubbles = useMemo(
    () => BUBBLES.filter((b) => b.orbit === 'inner'),
    [],
  );

  const outerSpin = useRef(new Animated.Value(0)).current;
  const innerSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(outerSpin, {
        toValue: 1,
        duration: 52000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const b = Animated.loop(
      Animated.timing(innerSpin, {
        toValue: 1,
        duration: 38000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [innerSpin, outerSpin]);

  const outerRot = outerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const innerRot = innerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const outerCounter = outerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const innerCounter = innerSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.root, { width: size, height: size }, style]}>
      <GlowRing size={outer} duration={7200} strokeWidth={2.2} />
      <GlowRing size={inner} duration={5400} reverse soft strokeWidth={1.8} />

      <AnimatedView
        style={[
          styles.carrier,
          { width: size, height: size, transform: [{ rotate: outerRot }] },
        ]}
      >
        {outerBubbles.map((b) => (
          <OrbitBubble
            key={`o-${b.kind}-${b.angle}`}
            bubble={b}
            radius={outer / 2}
            stageSize={size}
            counterRotate={outerCounter}
          />
        ))}
      </AnimatedView>

      <AnimatedView
        style={[
          styles.carrier,
          { width: size, height: size, transform: [{ rotate: innerRot }] },
        ]}
      >
        {innerBubbles.map((b) => (
          <OrbitBubble
            key={`i-${b.kind}-${b.angle}`}
            bubble={b}
            radius={inner / 2}
            stageSize={size}
            counterRotate={innerCounter}
          />
        ))}
      </AnimatedView>

      <View
        style={[
          styles.avatar,
          {
            width: avatar,
            height: avatar,
            borderRadius: avatar / 2,
          },
        ]}
      >
        <View style={styles.avatarHead} />
        <View style={styles.avatarBody} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseRing: {
    position: 'absolute',
  },
  carrier: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: palette.white,
    shadowColor: palette.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 5,
  },
  avatarHead: {
    width: '38%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#F5C088',
    marginBottom: 2,
  },
  avatarBody: {
    width: '62%',
    height: '38%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: '#93A8D0',
  },
});
