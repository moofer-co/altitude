import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { layout, palette, radii, spacing } from '../constants/tokens';

export type PageSkeletonVariant =
  | 'explore'
  | 'trips'
  | 'saved'
  | 'account'
  | 'offers'
  | 'search'
  | 'dates'
  | 'destinations'
  | 'multiFlights';

/** @deprecated Prefer PageSkeletonVariant — kept for existing tab imports. */
export type TabSkeletonVariant = PageSkeletonVariant;

/**
 * Soft page reveal with content-shaped skeleton.
 * First visit: brief skeleton, then dissolve + slight rise.
 * Return visits: light settle only.
 */
export function PageEnter({
  children,
  variant,
  backgroundColor = palette.white,
}: {
  children: ReactNode;
  variant: PageSkeletonVariant;
  backgroundColor?: string;
}) {
  const focused = useIsFocused();
  const visited = useRef(false);
  const [overlay, setOverlay] = useState(true);
  const contentOp = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(10)).current;
  const skelOp = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!focused) return;

    if (visited.current) {
      setOverlay(false);
      contentOp.setValue(0.94);
      contentY.setValue(6);
      Animated.parallel([
        Animated.timing(contentOp, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    visited.current = true;
    setOverlay(true);
    skelOp.setValue(1);
    contentOp.setValue(0);
    contentY.setValue(12);

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(skelOp, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(contentOp, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setOverlay(false);
      });
    }, 200);

    return () => clearTimeout(t);
  }, [focused, contentOp, contentY, skelOp]);

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOp,
            transform: [{ translateY: contentY }],
          },
        ]}
      >
        {children}
      </Animated.View>

      {overlay ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.skelLayer,
            { backgroundColor, opacity: skelOp },
          ]}
        >
          <Skeleton variant={variant} pulse={pulse} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Alias used by tab screens. */
export const TabScreenEnter = PageEnter;

function Skeleton({
  variant,
  pulse,
}: {
  variant: PageSkeletonVariant;
  pulse: Animated.Value;
}) {
  const bone = (extra: object, key: string) => (
    <Animated.View
      key={key}
      style={[styles.bone, extra, { opacity: pulse }]}
    />
  );

  if (variant === 'explore') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 148, height: 44, borderRadius: 22 }, 'a')}
          {bone({ width: 88, height: 36, borderRadius: 18 }, 'b')}
        </View>
        {bone({ height: 56, borderRadius: radii.lg, marginTop: spacing.md }, 'c')}
        {bone({ width: 120, height: 18, marginTop: spacing.xl }, 'd')}
        <View style={[styles.row, { marginTop: spacing.md, gap: 12 }]}>
          {bone({ flex: 1, height: 168, borderRadius: radii.lg }, 'e')}
          {bone({ flex: 1, height: 168, borderRadius: radii.lg }, 'f')}
        </View>
        {bone({ width: 100, height: 18, marginTop: spacing.xl }, 'g')}
        <View style={[styles.row, { marginTop: spacing.md, gap: 12 }]}>
          {bone({ width: 168, height: 140, borderRadius: radii.lg }, 'h')}
          {bone({ width: 168, height: 140, borderRadius: radii.lg }, 'i')}
        </View>
      </View>
    );
  }

  if (variant === 'trips') {
    return (
      <View style={styles.pad}>
        {bone({ width: 96, height: 28, marginBottom: spacing.md }, 't0')}
        {bone({ height: 88, borderRadius: radii.lg, marginBottom: spacing.md }, 't1')}
        {bone({ height: 88, borderRadius: radii.lg, marginBottom: spacing.md }, 't2')}
        {bone({ height: 88, borderRadius: radii.lg, marginBottom: spacing.md }, 't3')}
        {bone({ height: 88, borderRadius: radii.lg }, 't4')}
      </View>
    );
  }

  if (variant === 'saved') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 110, height: 28 }, 's0')}
          {bone({ width: 72, height: 28, borderRadius: 14 }, 's1')}
        </View>
        {bone({ height: 44, borderRadius: radii.md, marginTop: spacing.md }, 's2')}
        {[0, 1, 2].map((i) =>
          bone(
            {
              height: 120,
              borderRadius: radii.lg,
              marginTop: spacing.md,
            },
            `sc${i}`,
          ),
        )}
      </View>
    );
  }

  if (variant === 'offers') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 120, height: 28 }, 'o0')}
          {bone({ width: 40, height: 40, borderRadius: 20 }, 'o1')}
        </View>
        <View style={[styles.row, { marginTop: spacing.md, gap: spacing.sm }]}>
          {[0, 1, 2, 3].map((i) =>
            bone({ width: 72, height: 32, borderRadius: 16 }, `oc${i}`),
          )}
        </View>
        {[0, 1, 2, 3].map((i) =>
          bone(
            {
              height: 88,
              borderRadius: radii.md,
              marginTop: spacing.md,
            },
            `ocard${i}`,
          ),
        )}
      </View>
    );
  }

  if (variant === 'search') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 160, height: 36, borderRadius: 18 }, 'loc')}
          {bone({ width: 36, height: 36, borderRadius: 18 }, 'x')}
        </View>
        {bone({ height: 52, borderRadius: radii.full, marginTop: spacing.lg }, 'q')}
        {bone({ width: 100, height: 14, marginTop: spacing.xl }, 'lab')}
        {[0, 1, 2, 3, 4, 5].map((i) =>
          bone(
            {
              height: 56,
              borderRadius: radii.md,
              marginTop: spacing.sm,
            },
            `a${i}`,
          ),
        )}
      </View>
    );
  }

  if (variant === 'dates') {
    return (
      <View style={styles.pad}>
        {bone({ width: 140, height: 28, marginBottom: spacing.md }, 'd0')}
        {bone({ height: 44, borderRadius: radii.md, marginBottom: spacing.lg }, 'd1')}
        {bone({ height: 280, borderRadius: radii.lg, marginBottom: spacing.md }, 'cal')}
        {bone({ height: 52, borderRadius: radii.full, marginTop: spacing.lg }, 'cta')}
      </View>
    );
  }

  if (variant === 'destinations') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 44, height: 44, borderRadius: 22 }, 'back')}
          {bone({ flex: 1, height: 44, borderRadius: 22, marginHorizontal: 8 }, 'title')}
          {bone({ width: 44, height: 44, borderRadius: 22 }, 'search')}
        </View>
        <View style={[styles.row, { marginTop: spacing.lg, justifyContent: 'flex-start', gap: 20 }]}>
          {bone({ width: 36, height: 18 }, 't1')}
          {bone({ width: 110, height: 18 }, 't2')}
          {bone({ width: 72, height: 18 }, 't3')}
          {bone({ width: 64, height: 18 }, 't4')}
        </View>
        <View style={[styles.row, { marginTop: spacing.lg, alignItems: 'flex-start', gap: 12 }]}>
          <View style={{ flex: 1, gap: 12 }}>
            {bone({ height: 210, borderRadius: 22 }, 'c1')}
            {bone({ height: 160, borderRadius: 22 }, 'c2')}
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            {bone({ height: 160, borderRadius: 22 }, 'c3')}
            {bone({ height: 210, borderRadius: 22 }, 'c4')}
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'multiFlights') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {bone({ width: 44, height: 44, borderRadius: 22 }, 'back')}
          <View style={{ flex: 1, gap: 6, marginHorizontal: 8 }}>
            {bone({ width: 72, height: 12 }, 'mode')}
            {bone({ width: '70%', height: 18 }, 'title')}
          </View>
          {bone({ width: 64, height: 36, borderRadius: 18 }, 'pax')}
        </View>
        <View style={[styles.row, { marginTop: spacing.md, gap: 8, justifyContent: 'flex-start' }]}>
          {bone({ width: 108, height: 56, borderRadius: radii.lg }, 'r1')}
          {bone({ width: 108, height: 56, borderRadius: radii.lg }, 'r2')}
          {bone({ width: 108, height: 56, borderRadius: radii.lg }, 'r3')}
        </View>
        {bone({ width: '55%', height: 22, marginTop: spacing.lg }, 'sec')}
        {bone({ width: '40%', height: 14, marginTop: 8 }, 'date')}
        {bone({ height: 4, borderRadius: 2, marginTop: spacing.md }, 'prog')}
        {bone({ height: 110, borderRadius: radii.lg, marginTop: spacing.lg }, 'f1')}
        {bone({ height: 110, borderRadius: radii.lg, marginTop: spacing.md }, 'f2')}
        {bone({ height: 110, borderRadius: radii.lg, marginTop: spacing.md }, 'f3')}
      </View>
    );
  }

  // account
  return (
    <View style={styles.pad}>
      <View style={[styles.row, { alignItems: 'center', gap: spacing.md }]}>
        {bone({ width: 64, height: 64, borderRadius: 32 }, 'p')}
        <View style={{ flex: 1, gap: 8 }}>
          {bone({ width: '60%', height: 18 }, 'n')}
          {bone({ width: '40%', height: 14 }, 'e')}
        </View>
      </View>
      <View style={[styles.row, { marginTop: spacing.xl, gap: 12 }]}>
        {bone({ flex: 1, height: 64, borderRadius: radii.md }, 'st1')}
        {bone({ flex: 1, height: 64, borderRadius: radii.md }, 'st2')}
        {bone({ flex: 1, height: 64, borderRadius: radii.md }, 'st3')}
      </View>
      {[0, 1, 2, 3].map((i) =>
        bone(
          { height: 52, borderRadius: radii.md, marginTop: spacing.md },
          `row${i}`,
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  skelLayer: {
    paddingTop: spacing.sm,
  },
  pad: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bone: {
    backgroundColor: palette.gray200,
  },
});
