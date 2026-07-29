import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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

type OrbitId = 'outer' | 'inner';

type ElementSpec = {
  id: string;
  kind: TravelKind;
  size: number;
  color: string;
  iconColor: string;
  orbit: OrbitId;
};

/** Slower, calmer pacing — roughly 2× previous. */
const APPEAR_MS = 1400;
const HIDE_MS = 1200;
const MIN_VISIBLE_MS = 9000;
const GAP_AFTER_APPEAR_MS = 2200;
const INITIAL_STAGGER_MS = 1600;
/** Minimum angular separation between visible elements on the same orbit. */
const MIN_GAP_DEG = 58;
/** Separation vs the other orbit so icons don't stack on top of each other. */
const CROSS_GAP_DEG = 42;

const ELEMENTS: ElementSpec[] = [
  { id: 'passport', kind: 'passport', size: 50, color: palette.primary500, iconColor: palette.white, orbit: 'outer' },
  { id: 'plane', kind: 'plane', size: 44, color: '#F59E0B', iconColor: palette.white, orbit: 'outer' },
  { id: 'globe', kind: 'globe', size: 46, color: '#16A34A', iconColor: palette.white, orbit: 'outer' },
  { id: 'pin', kind: 'pin', size: 40, color: '#EC4899', iconColor: palette.white, orbit: 'outer' },
  { id: 'bag', kind: 'bag', size: 38, color: '#0D9488', iconColor: palette.white, orbit: 'inner' },
  { id: 'compass', kind: 'compass', size: 36, color: '#A78BFA', iconColor: palette.white, orbit: 'inner' },
  { id: 'ticket', kind: 'ticket', size: 34, color: '#F472B6', iconColor: palette.white, orbit: 'inner' },
  { id: 'sun', kind: 'sun', size: 32, color: '#FBBF24', iconColor: '#78350F', orbit: 'inner' },
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

function angDist(a: number, b: number) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function pickFreeAngle(
  sameOrbit: number[],
  otherOrbit: number[],
  preferAwayFrom?: number,
): number {
  let best = Math.random() * 360;
  let bestScore = -1;

  for (let i = 0; i < 36; i++) {
    const candidate = Math.random() * 360;
    const sameGap =
      sameOrbit.length === 0
        ? 180
        : Math.min(...sameOrbit.map((o) => angDist(candidate, o)));
    if (sameGap < MIN_GAP_DEG) continue;

    const crossGap =
      otherOrbit.length === 0
        ? 180
        : Math.min(...otherOrbit.map((o) => angDist(candidate, o)));
    if (crossGap < CROSS_GAP_DEG) continue;

    let score = sameGap + crossGap * 0.5;
    if (preferAwayFrom != null) score += angDist(candidate, preferAwayFrom) * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (bestScore < 0 && sameOrbit.length > 0) {
    const sorted = [...sameOrbit].sort((a, b) => a - b);
    let maxGap = -1;
    let mid = 0;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length] + (i + 1 === sorted.length ? 360 : 0);
      const gap = b - a;
      if (gap > maxGap) {
        maxGap = gap;
        mid = (a + gap / 2) % 360;
      }
    }
    return mid;
  }

  return best;
}

type ElementHandle = {
  id: string;
  orbit: OrbitId;
  getAngle: () => number | null;
  isVisible: () => boolean;
  visibleSince: () => number;
  hide: () => Promise<void>;
  showAt: (angle: number) => Promise<void>;
};

/**
 * Rides the shared orbit rotation. Visibility fades in/out without
 * stopping the carrier — so neighbours keep turning undisturbed.
 */
function OrbitElement({
  spec,
  radius,
  stageSize,
  counterRotate,
  register,
}: {
  spec: ElementSpec;
  radius: number;
  stageSize: number;
  counterRotate: Animated.AnimatedInterpolation<string>;
  register: (handle: ElementHandle | null) => void;
}) {
  const [angle, setAngle] = useState<number | null>(null);
  const visibleRef = useRef(false);
  const angleRef = useRef<number | null>(null);
  const sinceRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  const hide = useCallback(() => {
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: HIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: HIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        visibleRef.current = false;
        angleRef.current = null;
        setAngle(null);
        resolve();
      });
    });
  }, [opacity, scale]);

  const showAt = useCallback(
    (next: number) => {
      return new Promise<void>((resolve) => {
        angleRef.current = next;
        setAngle(next);
        opacity.setValue(0);
        scale.setValue(0.94);
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: APPEAR_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: APPEAR_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            visibleRef.current = true;
            sinceRef.current = Date.now();
            resolve();
          });
        });
      });
    },
    [opacity, scale],
  );

  useEffect(() => {
    const handle: ElementHandle = {
      id: spec.id,
      orbit: spec.orbit,
      getAngle: () => angleRef.current,
      isVisible: () => visibleRef.current,
      visibleSince: () => sinceRef.current,
      hide,
      showAt,
    };
    register(handle);
    return () => register(null);
  }, [hide, register, showAt, spec.id, spec.orbit]);

  if (angle == null) return null;

  const rad = (angle * Math.PI) / 180;
  const left = stageSize / 2 + Math.cos(rad) * radius - spec.size / 2;
  const top = stageSize / 2 + Math.sin(rad) * radius - spec.size / 2;

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
          left,
          top,
          opacity,
          transform: [{ rotate: counterRotate }, { scale }],
        },
      ]}
    >
      <TravelIcon kind={spec.kind} color={spec.iconColor} size={spec.size} />
    </AnimatedView>
  );
}

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    if (signal.cancelled) {
      clearTimeout(t);
      resolve();
    }
  });
}

/**
 * Onboarding hero: glowing rings, user at the centre, travel elements
 * that keep orbiting — one quietly leaves, then returns elsewhere with
 * spacing, while the others never stop turning.
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

  const outerEls = useMemo(
    () => ELEMENTS.filter((e) => e.orbit === 'outer'),
    [],
  );
  const innerEls = useMemo(
    () => ELEMENTS.filter((e) => e.orbit === 'inner'),
    [],
  );

  const handles = useRef(new Map<string, ElementHandle>());

  const register = useCallback((id: string) => {
    return (handle: ElementHandle | null) => {
      if (handle) handles.current.set(id, handle);
      else handles.current.delete(id);
    };
  }, []);

  const outerSpin = useRef(new Animated.Value(0)).current;
  const innerSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ~2× slower than the previous orbital pace
    const a = Animated.loop(
      Animated.timing(outerSpin, {
        toValue: 1,
        duration: 96000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const b = Animated.loop(
      Animated.timing(innerSpin, {
        toValue: 1,
        duration: 72000,
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

  // Choreography: seed spaced positions, then cycle hide → appear elsewhere
  useEffect(() => {
    const signal = { cancelled: false };

    const occupiedOn = (orbit: OrbitId, exceptId?: string) => {
      const angles: number[] = [];
      handles.current.forEach((h) => {
        if (h.orbit !== orbit) return;
        if (exceptId && h.id === exceptId) return;
        if (!h.isVisible()) return;
        const a = h.getAngle();
        if (a != null) angles.push(a);
      });
      return angles;
    };

    const otherOrbitOf = (orbit: OrbitId) =>
      orbit === 'outer' ? 'inner' : 'outer';

    const waitForHandles = async () => {
      for (let i = 0; i < 40 && !signal.cancelled; i++) {
        if (handles.current.size >= ELEMENTS.length) return;
        await sleep(50, signal);
      }
    };

    const run = async () => {
      await waitForHandles();
      if (signal.cancelled) return;

      // Initial appear — one after another, well spaced
      for (let i = 0; i < ELEMENTS.length; i++) {
        if (signal.cancelled) return;
        const spec = ELEMENTS[i];
        const h = handles.current.get(spec.id);
        if (!h) continue;
        const angle = pickFreeAngle(
          occupiedOn(spec.orbit),
          occupiedOn(otherOrbitOf(spec.orbit)),
        );
        await h.showAt(angle);
        await sleep(INITIAL_STAGGER_MS, signal);
      }

      // Ongoing: hide one → others keep turning → appear elsewhere → repeat
      while (!signal.cancelled) {
        await sleep(GAP_AFTER_APPEAR_MS, signal);
        if (signal.cancelled) break;

        const visible = [...handles.current.values()]
          .filter((h) => h.isVisible())
          .sort((a, b) => a.visibleSince() - b.visibleSince());
        if (visible.length === 0) {
          await sleep(500, signal);
          continue;
        }

        let target = visible[0];
        const lived = Date.now() - target.visibleSince();
        if (lived < MIN_VISIBLE_MS) {
          await sleep(MIN_VISIBLE_MS - lived, signal);
          if (signal.cancelled) break;
        }

        const still = [...handles.current.values()]
          .filter((h) => h.isVisible())
          .sort((a, b) => a.visibleSince() - b.visibleSince());
        if (still.length) target = still[0];

        const oldAngle = target.getAngle();
        await target.hide();
        if (signal.cancelled) break;

        await sleep(900, signal);
        if (signal.cancelled) break;

        const nextAngle = pickFreeAngle(
          occupiedOn(target.orbit, target.id),
          occupiedOn(otherOrbitOf(target.orbit), target.id),
          oldAngle ?? undefined,
        );
        await target.showAt(nextAngle);
      }
    };

    run();
    return () => {
      signal.cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.root, { width: size, height: size }, style]}>
      <GlowRing size={outer} duration={9000} strokeWidth={2.2} />
      <GlowRing size={inner} duration={7000} reverse soft strokeWidth={1.8} />

      <AnimatedView
        style={[
          styles.carrier,
          { width: size, height: size, transform: [{ rotate: outerRot }] },
        ]}
      >
        {outerEls.map((spec) => (
          <OrbitElement
            key={spec.id}
            spec={spec}
            radius={outer / 2}
            stageSize={size}
            counterRotate={outerCounter}
            register={register(spec.id)}
          />
        ))}
      </AnimatedView>

      <AnimatedView
        style={[
          styles.carrier,
          { width: size, height: size, transform: [{ rotate: innerRot }] },
        ]}
      >
        {innerEls.map((spec) => (
          <OrbitElement
            key={spec.id}
            spec={spec}
            radius={inner / 2}
            stageSize={size}
            counterRotate={innerCounter}
            register={register(spec.id)}
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
