import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  | 'sun'
  | 'anchor';

type OrbitId = 'outer' | 'inner';

type ElementSpec = {
  id: string;
  kind: TravelKind;
  size: number;
  color: string;
  iconColor: string;
};

/** Hide / appear pacing. */
const APPEAR_MS = 2800;
const HIDE_MS = 2400;
const MIN_VISIBLE_MS = 18000;
const GAP_AFTER_APPEAR_MS = 4500;
const INITIAL_STAGGER_MS = 2800;
const BEAT_AFTER_HIDE_MS = 1800;
/** Pause between introducing elements 6 → 9 while others keep spinning. */
const RAMP_GAP_MS = 5200;

/** Start with five; ramp up to nine. */
const OPEN_COUNT = 5;
const MAX_VISIBLE = 9;

/** Orbital pace. */
const OUTER_SPIN_MS = 52000;
const INNER_SPIN_MS = 38000;

const MIN_GAP_DEG = 58;
const CROSS_GAP_DEG = 44;

/** Prefer switching rings when reappearing. */
const SWITCH_ORBIT_CHANCE = 0.7;

const ELEMENTS: ElementSpec[] = [
  { id: 'passport', kind: 'passport', size: 50, color: palette.primary500, iconColor: palette.white },
  { id: 'plane', kind: 'plane', size: 44, color: '#F59E0B', iconColor: palette.white },
  { id: 'pin', kind: 'pin', size: 40, color: '#EC4899', iconColor: palette.white },
  { id: 'globe', kind: 'globe', size: 46, color: '#16A34A', iconColor: palette.white },
  { id: 'bag', kind: 'bag', size: 38, color: '#0D9488', iconColor: palette.white },
  { id: 'compass', kind: 'compass', size: 36, color: '#A78BFA', iconColor: palette.white },
  { id: 'ticket', kind: 'ticket', size: 34, color: '#F472B6', iconColor: palette.white },
  { id: 'sun', kind: 'sun', size: 32, color: '#FBBF24', iconColor: '#78350F' },
  { id: 'anchor', kind: 'anchor', size: 36, color: '#0891B2', iconColor: palette.white },
];

/** Spaced seed poses for the opening five, then ramp introduces. */
const SEED_POSES: { orbit: OrbitId; angle: number }[] = [
  { orbit: 'outer', angle: -30 },
  { orbit: 'outer', angle: 55 },
  { orbit: 'outer', angle: 160 },
  { orbit: 'inner', angle: 100 },
  { orbit: 'inner', angle: 250 },
  { orbit: 'outer', angle: 250 },
  { orbit: 'inner', angle: 20 },
  { orbit: 'inner', angle: 175 },
  { orbit: 'outer', angle: 300 },
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
    case 'anchor':
      return <Feather name="navigation" size={s} color={color} />;
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
      score += angDist(world, preferAwayWorld) * 0.45;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLocal = local;
    }
  }

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
    const spun = progress * 360;
    return orbit === 'outer'
      ? normDeg(midWorld - spun)
      : normDeg(midWorld + spun);
  }

  return bestLocal;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type ElementHandle = {
  id: string;
  getOrbit: () => OrbitId;
  getLocalAngle: () => number;
  isVisible: () => boolean;
  visibleSince: () => number;
  hide: () => Promise<void>;
  showAt: (orbit: OrbitId, angle: number) => Promise<void>;
};

/**
 * Each element has its own carrier wrapper bound to the shared spin for
 * whichever ring it currently rides — so it can hop outer ↔ inner while
 * hidden without interrupting anyone else.
 */
function OrbitElement({
  spec,
  stageSize,
  outerRadius,
  innerRadius,
  outerSpin,
  innerSpin,
  register,
}: {
  spec: ElementSpec;
  stageSize: number;
  outerRadius: number;
  innerRadius: number;
  outerSpin: Animated.Value;
  innerSpin: Animated.Value;
  register: (handle: ElementHandle | null) => void;
}) {
  const [orbit, setOrbit] = useState<OrbitId>('outer');
  const [angle, setAngle] = useState(0);
  const orbitRef = useRef<OrbitId>('outer');
  const angleRef = useRef(0);
  const visibleRef = useRef(false);
  const sinceRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const busyRef = useRef(false);

  const hide = useCallback(() => {
    if (busyRef.current) return Promise.resolve();
    if (!visibleRef.current) return Promise.resolve();
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
    (nextOrbit: OrbitId, nextAngle: number) => {
      if (busyRef.current) return Promise.resolve();
      busyRef.current = true;
      return new Promise<void>((resolve) => {
        orbitRef.current = nextOrbit;
        angleRef.current = nextAngle;
        setOrbit(nextOrbit);
        setAngle(nextAngle);
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
      getOrbit: () => orbitRef.current,
      getLocalAngle: () => angleRef.current,
      isVisible: () => visibleRef.current,
      visibleSince: () => sinceRef.current,
      hide,
      showAt,
    };
    register(handle);
    return () => register(null);
  }, [hide, register, showAt, spec.id]);

  const radius = orbit === 'outer' ? outerRadius : innerRadius;
  const spin = orbit === 'outer' ? outerSpin : innerSpin;
  const reverse = orbit === 'inner';

  const carrierRot = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse
      ? [`${angle}deg`, `${angle - 360}deg`]
      : [`${angle}deg`, `${angle + 360}deg`],
  });
  const counterRot = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '360deg'] : ['0deg', '-360deg'],
  });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.carrier,
        {
          width: stageSize,
          height: stageSize,
          transform: [{ rotate: carrierRot }],
        },
      ]}
    >
      <AnimatedView
        style={[
          styles.bubble,
          {
            width: spec.size,
            height: spec.size,
            borderRadius: spec.size / 2,
            backgroundColor: spec.color,
            // Parked on the +x axis of this element's carrier; carrierRot carries angle
            left: stageSize / 2 + radius - spec.size / 2,
            top: stageSize / 2 - spec.size / 2,
            opacity,
            transform: [{ rotate: counterRot }, { scale }],
          },
        ]}
      >
        <TravelIcon kind={spec.kind} color={spec.iconColor} size={spec.size} />
      </AnimatedView>
    </AnimatedView>
  );
}

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    if (signal.cancelled) {
      resolve();
      return;
    }
    setTimeout(() => resolve(), ms);
  });
}

/**
 * Onboarding hero: glowing rings, user at the centre, travel elements
 * that keep orbiting. Opens with five. One fades out; another (or the
 * same) fades in on a random ring at a free angle — forever.
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
  const outerRadius = outer / 2;
  const innerRadius = inner / 2;

  const handles = useRef(new Map<string, ElementHandle>());
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

  useEffect(() => {
    const signal = { cancelled: false };

    const progressOf = (orbit: OrbitId) => {
      const period = orbit === 'outer' ? OUTER_SPIN_MS : INNER_SPIN_MS;
      const started =
        orbit === 'outer' ? outerStartedAt.current : innerStartedAt.current;
      if (!started) return 0;
      return ((Date.now() - started) % period) / period;
    };

    const worldAnglesOn = (orbit: OrbitId, exceptId?: string) => {
      const out: number[] = [];
      handles.current.forEach((h) => {
        if (!h.isVisible()) return;
        if (h.getOrbit() !== orbit) return;
        if (exceptId && h.id === exceptId) return;
        out.push(
          toWorldAngle(h.getLocalAngle(), progressOf(orbit), orbit),
        );
      });
      return out;
    };

    const pickOrbit = (from?: OrbitId): OrbitId => {
      if (from && Math.random() < SWITCH_ORBIT_CHANCE) {
        return from === 'outer' ? 'inner' : 'outer';
      }
      return Math.random() < 0.55 ? 'outer' : 'inner';
    };

    const placeFor = (
      exceptId: string | undefined,
      preferAwayWorld: number | undefined,
      preferFromOrbit?: OrbitId,
    ) => {
      const orbit = pickOrbit(preferFromOrbit);
      const other: OrbitId = orbit === 'outer' ? 'inner' : 'outer';
      const angle = pickFreeLocalAngle(
        orbit,
        worldAnglesOn(orbit, exceptId),
        worldAnglesOn(other, exceptId),
        progressOf(orbit),
        preferAwayWorld,
      );
      return { orbit, angle };
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

      // Open with 5 randomly chosen elements on spaced seed poses
      const shuffled = shuffle(ELEMENTS);
      const opener = shuffled.slice(0, OPEN_COUNT);
      const waiting = shuffled.slice(OPEN_COUNT);
      for (let i = 0; i < opener.length; i++) {
        if (signal.cancelled) return;
        const spec = opener[i];
        const h = handles.current.get(spec.id);
        if (!h) continue;
        const pose = SEED_POSES[i];
        await h.showAt(pose.orbit, pose.angle);
        await sleep(INITIAL_STAGGER_MS, signal);
      }

      // Ramp 6 → 9: introduce waiting elements while others keep spinning
      for (let i = 0; i < waiting.length && !signal.cancelled; i++) {
        await sleep(RAMP_GAP_MS, signal);
        if (signal.cancelled) break;
        const spec = waiting[i];
        const h = handles.current.get(spec.id);
        if (!h || h.isVisible()) continue;
        const { orbit, angle } = placeFor(spec.id, undefined, undefined);
        await h.showAt(orbit, angle);
      }

      // Steady cycle: hide one → beat → reappear elsewhere (count stays ~9)
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

        let leaving = visible[0];
        const lived = Date.now() - leaving.visibleSince();
        if (lived < MIN_VISIBLE_MS) {
          await sleep(MIN_VISIBLE_MS - lived, signal);
          if (signal.cancelled) break;
        }

        const still = [...handles.current.values()]
          .filter((h) => h.isVisible())
          .sort((a, b) => a.visibleSince() - b.visibleSince());
        if (still.length) leaving = still[0];

        const leftOrbit = leaving.getOrbit();
        const leftWorld = toWorldAngle(
          leaving.getLocalAngle(),
          progressOf(leftOrbit),
          leftOrbit,
        );

        await leaving.hide();
        if (signal.cancelled) break;

        await sleep(BEAT_AFTER_HIDE_MS, signal);
        if (signal.cancelled) break;

        const hidden = [...handles.current.values()].filter(
          (h) => !h.isVisible(),
        );
        const pool =
          hidden.length > 1 && Math.random() < 0.75
            ? hidden.filter((h) => h.id !== leaving.id)
            : hidden;
        const next =
          pool[Math.floor(Math.random() * pool.length)] ?? leaving;

        const { orbit, angle } = placeFor(next.id, leftWorld, leftOrbit);
        await next.showAt(orbit, angle);
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

      {ELEMENTS.map((spec) => (
        <OrbitElement
          key={spec.id}
          spec={spec}
          stageSize={size}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          outerSpin={outerSpin}
          innerSpin={innerSpin}
          register={register(spec.id)}
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
