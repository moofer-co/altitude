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
  /** Well-spaced seed angle on the carrier (degrees). */
  seedAngle: number;
};

/** Hide / appear pacing — ~2× slower than previous. */
const APPEAR_MS = 2800;
const HIDE_MS = 2400;
const MIN_VISIBLE_MS = 18000;
const GAP_AFTER_APPEAR_MS = 4500;
const INITIAL_STAGGER_MS = 3200;
const BEAT_AFTER_HIDE_MS = 1800;

/** Visible orbital pace (same order as the first working version). */
const OUTER_SPIN_MS = 52000;
const INNER_SPIN_MS = 38000;

/** Minimum angular separation between visible peers (degrees). */
const MIN_GAP_DEG = 62;
/** World-space gap vs the other orbit so icons don't stack. */
const CROSS_GAP_DEG = 48;

const ELEMENTS: ElementSpec[] = [
  {
    id: 'passport',
    kind: 'passport',
    size: 50,
    color: palette.primary500,
    iconColor: palette.white,
    orbit: 'outer',
    seedAngle: -38,
  },
  {
    id: 'plane',
    kind: 'plane',
    size: 44,
    color: '#F59E0B',
    iconColor: palette.white,
    orbit: 'outer',
    seedAngle: 32,
  },
  {
    id: 'pin',
    kind: 'pin',
    size: 40,
    color: '#EC4899',
    iconColor: palette.white,
    orbit: 'outer',
    seedAngle: 128,
  },
  {
    id: 'globe',
    kind: 'globe',
    size: 46,
    color: '#16A34A',
    iconColor: palette.white,
    orbit: 'outer',
    seedAngle: 205,
  },
  {
    id: 'bag',
    kind: 'bag',
    size: 38,
    color: '#0D9488',
    iconColor: palette.white,
    orbit: 'inner',
    seedAngle: 255,
  },
  {
    id: 'compass',
    kind: 'compass',
    size: 36,
    color: '#A78BFA',
    iconColor: palette.white,
    orbit: 'inner',
    seedAngle: 165,
  },
  {
    id: 'ticket',
    kind: 'ticket',
    size: 34,
    color: '#F472B6',
    iconColor: palette.white,
    orbit: 'inner',
    seedAngle: 58,
  },
  {
    id: 'sun',
    kind: 'sun',
    size: 32,
    color: '#FBBF24',
    iconColor: '#78350F',
    orbit: 'inner',
    seedAngle: 315,
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

function normDeg(d: number) {
  return ((d % 360) + 360) % 360;
}

function angDist(a: number, b: number) {
  let d = Math.abs(normDeg(a) - normDeg(b));
  if (d > 180) d = 360 - d;
  return d;
}

/** Outer carrier spins +progress; inner spins −progress (reverse). */
function toWorldAngle(local: number, progress: number, orbit: OrbitId) {
  const spun = progress * 360;
  return orbit === 'outer' ? normDeg(local + spun) : normDeg(local - spun);
}

function pickFreeLocalAngle(
  orbit: OrbitId,
  sameWorld: number[],
  otherWorld: number[],
  progress: number,
  preferAwayWorld?: number,
): number {
  let bestLocal = Math.random() * 360;
  let bestScore = -1;

  // Deterministic sweep + a few random probes for the largest clear slot
  for (let i = 0; i < 72; i++) {
    const local = i < 60 ? i * 6 : Math.random() * 360;
    const world = toWorldAngle(local, progress, orbit);

    const sameGap =
      sameWorld.length === 0
        ? 180
        : Math.min(...sameWorld.map((o) => angDist(world, o)));
    if (sameGap < MIN_GAP_DEG) continue;

    const crossGap =
      otherWorld.length === 0
        ? 180
        : Math.min(...otherWorld.map((o) => angDist(world, o)));
    if (crossGap < CROSS_GAP_DEG) continue;

    let score = sameGap + crossGap * 0.65;
    if (preferAwayWorld != null) {
      score += angDist(world, preferAwayWorld) * 0.35;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLocal = local;
    }
  }

  // Fallback: largest gap on this orbit in world space
  if (bestScore < 0) {
    const occupied = [...sameWorld].sort((a, b) => a - b);
    if (occupied.length === 0) return bestLocal;
    let maxGap = -1;
    let midWorld = 0;
    for (let i = 0; i < occupied.length; i++) {
      const a = occupied[i];
      const b =
        occupied[(i + 1) % occupied.length] +
        (i + 1 === occupied.length ? 360 : 0);
      const gap = b - a;
      if (gap > maxGap) {
        maxGap = gap;
        midWorld = normDeg(a + gap / 2);
      }
    }
    // Convert desired world angle back to local on this carrier
    const spun = progress * 360;
    return orbit === 'outer'
      ? normDeg(midWorld - spun)
      : normDeg(midWorld + spun);
  }

  return bestLocal;
}

type ElementHandle = {
  id: string;
  orbit: OrbitId;
  getLocalAngle: () => number;
  isVisible: () => boolean;
  visibleSince: () => number;
  hide: () => Promise<void>;
  showAt: (angle: number) => Promise<void>;
};

/**
 * Always mounted on the spinning carrier. Hide/show only fades opacity —
 * neighbours keep turning with no interruption.
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
  const [angle, setAngle] = useState(spec.seedAngle);
  const visibleRef = useRef(false);
  const angleRef = useRef(spec.seedAngle);
  const sinceRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const busyRef = useRef(false);

  const hide = useCallback(() => {
    if (busyRef.current) return Promise.resolve();
    busyRef.current = true;
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: HIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.88,
          duration: HIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        visibleRef.current = false;
        busyRef.current = false;
        resolve();
      });
    });
  }, [opacity, scale]);

  const showAt = useCallback(
    (next: number) => {
      if (busyRef.current) return Promise.resolve();
      busyRef.current = true;
      return new Promise<void>((resolve) => {
        // Reposition while invisible so the jump is never seen
        angleRef.current = next;
        setAngle(next);
        opacity.setValue(0);
        scale.setValue(0.88);
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
            busyRef.current = false;
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
      getLocalAngle: () => angleRef.current,
      isVisible: () => visibleRef.current,
      visibleSince: () => sinceRef.current,
      hide,
      showAt,
    };
    register(handle);
    return () => register(null);
  }, [hide, register, showAt, spec.id, spec.orbit]);

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
    if (signal.cancelled) {
      resolve();
      return;
    }
    const t = setTimeout(() => resolve(), ms);
    // Cleared on cancel via short-poll below is unnecessary; choreography checks signal
    void t;
  });
}

/**
 * Onboarding hero: glowing rings, user at the centre, travel elements
 * that keep orbiting. One quietly fades out; the rest keep turning;
 * it fades back in at a free spot — then the next one leaves. Forever.
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
  // Native-driven spins don't sync to JS listeners — clock the phase ourselves.
  const outerStartedAt = useRef(0);
  const innerStartedAt = useRef(0);

  const register = useCallback((id: string) => {
    return (handle: ElementHandle | null) => {
      if (handle) handles.current.set(id, handle);
      else handles.current.delete(id);
    };
  }, []);

  const outerSpin = useRef(new Animated.Value(0)).current;
  const innerSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    outerStartedAt.current = Date.now();
    innerStartedAt.current = Date.now();

    const a = Animated.loop(
      Animated.timing(outerSpin, {
        toValue: 1,
        duration: OUTER_SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const b = Animated.loop(
      Animated.timing(innerSpin, {
        toValue: 1,
        duration: INNER_SPIN_MS,
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

  useEffect(() => {
    const signal = { cancelled: false };

    const progressOf = (orbit: OrbitId) => {
      const period = orbit === 'outer' ? OUTER_SPIN_MS : INNER_SPIN_MS;
      const started =
        orbit === 'outer' ? outerStartedAt.current : innerStartedAt.current;
      if (!started) return 0;
      return ((Date.now() - started) % period) / period;
    };

    const worldAngles = (orbit: OrbitId, exceptId?: string) => {
      const out: number[] = [];
      handles.current.forEach((h) => {
        if (h.orbit !== orbit) return;
        if (exceptId && h.id === exceptId) return;
        if (!h.isVisible()) return;
        out.push(toWorldAngle(h.getLocalAngle(), progressOf(orbit), orbit));
      });
      return out;
    };

    const waitForHandles = async () => {
      for (let i = 0; i < 60 && !signal.cancelled; i++) {
        if (handles.current.size >= ELEMENTS.length) return;
        await sleep(40, signal);
      }
    };

    const run = async () => {
      await waitForHandles();
      if (signal.cancelled) return;

      // Seed appear in spaced order — carriers already spinning
      for (let i = 0; i < ELEMENTS.length; i++) {
        if (signal.cancelled) return;
        const spec = ELEMENTS[i];
        const h = handles.current.get(spec.id);
        if (!h) continue;
        await h.showAt(spec.seedAngle);
        await sleep(INITIAL_STAGGER_MS, signal);
      }

      // Cycle: hide oldest → beat → reappear in a free world slot → beat → repeat
      while (!signal.cancelled) {
        await sleep(GAP_AFTER_APPEAR_MS, signal);
        if (signal.cancelled) break;

        const visible = [...handles.current.values()]
          .filter((h) => h.isVisible())
          .sort((a, b) => a.visibleSince() - b.visibleSince());
        if (visible.length === 0) {
          await sleep(800, signal);
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

        const oldWorld = toWorldAngle(
          target.getLocalAngle(),
          progressOf(target.orbit),
          target.orbit,
        );

        // Fade out only this one — others keep orbiting
        await target.hide();
        if (signal.cancelled) break;

        await sleep(BEAT_AFTER_HIDE_MS, signal);
        if (signal.cancelled) break;

        const other: OrbitId = target.orbit === 'outer' ? 'inner' : 'outer';
        const nextLocal = pickFreeLocalAngle(
          target.orbit,
          worldAngles(target.orbit, target.id),
          worldAngles(other),
          progressOf(target.orbit),
          oldWorld,
        );
        await target.showAt(nextLocal);
      }
    };

    run();
    return () => {
      signal.cancelled = true;
    };
  }, []);

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
