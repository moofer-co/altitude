import { useEffect, useId, useRef, useState } from 'react';
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

type ElementSpec = {
  kind: TravelKind;
  size: number;
  color: string;
  iconColor: string;
  /** Stagger so elements never sync up. */
  startDelay: number;
};

const ELEMENTS: ElementSpec[] = [
  { kind: 'passport', size: 50, color: palette.primary500, iconColor: palette.white, startDelay: 200 },
  { kind: 'plane', size: 44, color: '#F59E0B', iconColor: palette.white, startDelay: 1100 },
  { kind: 'globe', size: 46, color: '#16A34A', iconColor: palette.white, startDelay: 2100 },
  { kind: 'pin', size: 40, color: '#EC4899', iconColor: palette.white, startDelay: 3200 },
  { kind: 'bag', size: 38, color: '#0D9488', iconColor: palette.white, startDelay: 4300 },
  { kind: 'compass', size: 36, color: '#A78BFA', iconColor: palette.white, startDelay: 5400 },
  { kind: 'ticket', size: 34, color: '#F472B6', iconColor: palette.white, startDelay: 6600 },
  { kind: 'sun', size: 32, color: '#FBBF24', iconColor: '#78350F', startDelay: 7800 },
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

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

type Pose = {
  left: number;
  top: number;
  /** Drift direction in radians while visible. */
  driftAngle: number;
  /** Slow self-rotation sense. */
  spinDir: 1 | -1;
};

function pickPose(
  stageSize: number,
  bubbleSize: number,
  rMin: number,
  rMax: number,
): Pose {
  const angle = Math.random() * Math.PI * 2;
  const radius = rand(rMin, rMax);
  const cx = stageSize / 2 + Math.cos(angle) * radius;
  const cy = stageSize / 2 + Math.sin(angle) * radius;
  return {
    left: cx - bubbleSize / 2,
    top: cy - bubbleSize / 2,
    driftAngle: angle + rand(-0.6, 0.6),
    spinDir: Math.random() > 0.5 ? 1 : -1,
  };
}

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(() => resolve(), ms);
    if (signal.cancelled) {
      clearTimeout(t);
      resolve();
    }
  });
}

function runAnim(
  anim: Animated.CompositeAnimation,
  signal: { cancelled: boolean },
) {
  return new Promise<void>((resolve) => {
    if (signal.cancelled) {
      resolve();
      return;
    }
    anim.start(({ finished }) => {
      resolve();
      if (!finished) {
        // interrupted
      }
    });
  });
}

/**
 * One travel element: fades in at a random spot near the rings, drifts and
 * rotates calmly, fades out, then later returns somewhere else.
 * Lifecycles are staggered so the field never blinks in unison.
 */
function TravelElement({
  spec,
  stageSize,
  rMin,
  rMax,
}: {
  spec: ElementSpec;
  stageSize: number;
  rMin: number;
  rMax: number;
}) {
  const [pose, setPose] = useState<Pose>(() =>
    pickPose(stageSize, spec.size, rMin, rMax),
  );
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const signal = { cancelled: false };

    const cycle = async () => {
      await sleep(spec.startDelay, signal);

      while (!signal.cancelled) {
        const next = pickPose(stageSize, spec.size, rMin, rMax);
        setPose(next);
        opacity.setValue(0);
        scale.setValue(0.92);
        drift.setValue(0);
        spin.setValue(0);

        // Soft appear
        await runAnim(
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: rand(650, 900),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: rand(650, 900),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          signal,
        );
        if (signal.cancelled) break;

        // Linger — gentle drift + slow rotate (mature, unhurried)
        const linger = rand(3800, 6200);
        const motion = Animated.parallel([
          Animated.timing(drift, {
            toValue: 1,
            duration: linger,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(spin, {
            toValue: 1,
            duration: linger,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]);
        motion.start();
        await sleep(linger, signal);
        motion.stop();
        if (signal.cancelled) break;

        // Soft disappear
        await runAnim(
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: rand(550, 800),
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.94,
              duration: rand(550, 800),
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          signal,
        );
        if (signal.cancelled) break;

        // Rest off-stage before returning elsewhere
        await sleep(rand(1600, 4200), signal);
      }
    };

    cycle();
    return () => {
      signal.cancelled = true;
      opacity.stopAnimation();
      scale.stopAnimation();
      drift.stopAnimation();
      spin.stopAnimation();
    };
  }, [drift, opacity, rMax, rMin, scale, spec.size, spec.startDelay, spin, stageSize]);

  const driftDist = 10;
  const dx = Math.cos(pose.driftAngle) * driftDist;
  const dy = Math.sin(pose.driftAngle) * driftDist;

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx],
  });
  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dy],
  });
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: pose.spinDir === 1 ? ['-12deg', '12deg'] : ['12deg', '-12deg'],
  });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
          left: pose.left,
          top: pose.top,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      <TravelIcon kind={spec.kind} color={spec.iconColor} size={spec.size} />
    </AnimatedView>
  );
}

/**
 * Onboarding hero: glowing earth-like rings, user at the centre,
 * travel elements that quietly appear, drift, and leave — one by one.
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

  // Spawn band between the rings (with a little room outside)
  const rMin = inner / 2 - 6;
  const rMax = outer / 2 + 10;

  return (
    <View style={[styles.root, { width: size, height: size }, style]}>
      <GlowRing size={outer} duration={7200} strokeWidth={2.2} />
      <GlowRing size={inner} duration={5400} reverse soft strokeWidth={1.8} />

      {ELEMENTS.map((spec) => (
        <TravelElement
          key={spec.kind}
          spec={spec}
          stageSize={size}
          rMin={rMin}
          rMax={rMax}
        />
      ))}

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
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
