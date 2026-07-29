import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing, radii, shadows } from '../constants/tokens';
import {
  nearbyAirports,
  recentOrigins,
  type NearbyAirport,
} from '../data/destinations';

const { height: SH } = Dimensions.get('window');
const HPAD = spacing.lg;
const SHEET_H = SH * 0.78;
const DISMISS_AT = SHEET_H * 0.3;

const FURTHEST = Math.max(...nearbyAirports.map((a) => a.distanceKm));

type DetectState = 'idle' | 'locating' | 'found';

export function LocationSheet({
  visible,
  currentIata,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentIata: string;
  onClose: () => void;
  onSelect: (airport: NearbyAirport) => void;
}) {
  const insets = useSafeAreaInsets();
  const [detect, setDetect] = useState<DetectState>('idle');
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const radar = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setDetect('idle');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 62,
        friction: 11,
      }).start();
    } else {
      translateY.setValue(SHEET_H);
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (detect !== 'locating') return;
    const loop = Animated.loop(
      Animated.timing(radar, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      radar.setValue(0);
    };
  }, [detect, radar]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_AT || g.vy > 0.8) dismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 62,
            friction: 11,
          }).start();
      },
    }),
  ).current;

  const runDetect = useCallback(() => {
    setDetect('locating');
    timer.current = setTimeout(() => setDetect('found'), 1500);
  }, []);

  const ringScale = radar.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ringOpacity = radar.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={dismiss} />

        <Animated.View
          style={[
            s.sheet,
            { height: SHEET_H + insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <View {...pan.panHandlers} style={s.drag}>
            <View style={s.handle} />
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text variant="h2">Flying from</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  Pick the airport you will depart from
                </Text>
              </View>
              <Pressable style={s.close} onPress={dismiss} hitSlop={8}>
                <Feather name="x" size={19} color={palette.gray600} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: HPAD,
              paddingTop: spacing.md,
              paddingBottom: spacing.xl + insets.bottom,
            }}
          >
            {/* Detect */}
            <Pressable
              style={[s.detect, detect === 'found' && s.detectFound]}
              onPress={detect === 'idle' ? runDetect : undefined}
              disabled={detect !== 'idle'}
            >
              <View style={s.detectIconWrap}>
                {detect === 'locating' && (
                  <Animated.View
                    style={[
                      s.radar,
                      { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                    ]}
                  />
                )}
                <View
                  style={[
                    s.detectIcon,
                    detect === 'found' && { backgroundColor: palette.success },
                  ]}
                >
                  <Feather
                    name={detect === 'found' ? 'check' : 'navigation'}
                    size={17}
                    color={palette.white}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">
                  {detect === 'idle'
                    ? 'Use my current location'
                    : detect === 'locating'
                      ? 'Finding you…'
                      : 'New Delhi, India'}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {detect === 'idle'
                    ? 'We will suggest the closest airports'
                    : detect === 'locating'
                      ? 'Checking nearby airports'
                      : 'Closest airport is Delhi (DEL), 16 km away'}
                </Text>
              </View>

              {detect === 'idle' && (
                <Feather name="chevron-right" size={18} color={palette.gray400} />
              )}
            </Pressable>

            {/* Nearby */}
            <Text variant="label" color="textTertiary" style={s.sectionLabel}>
              {detect === 'found' ? 'CLOSEST TO YOU' : 'NEARBY AIRPORTS'}
            </Text>

            {nearbyAirports.map((a) => (
              <AirportRow
                key={a.iata}
                airport={a}
                selected={a.iata === currentIata}
                showDistance
                onPress={() => onSelect(a)}
              />
            ))}

            {/* Recent */}
            <Text variant="label" color="textTertiary" style={s.sectionLabel}>
              RECENTLY USED
            </Text>

            {recentOrigins.map((a) => (
              <AirportRow
                key={a.iata}
                airport={a}
                selected={a.iata === currentIata}
                onPress={() => onSelect(a)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AirportRow({
  airport,
  selected,
  showDistance,
  onPress,
}: {
  airport: NearbyAirport;
  selected: boolean;
  showDistance?: boolean;
  onPress: () => void;
}) {
  const fill = Math.max(0.06, airport.distanceKm / FURTHEST);

  return (
    <Pressable
      style={({ pressed }) => [
        s.row,
        selected && s.rowOn,
        pressed && !selected && s.rowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[s.code, selected && s.codeOn]}>
        <Text
          variant="caption"
          style={{
            color: selected ? palette.white : palette.gray700,
            fontWeight: '700',
          }}
        >
          {airport.iata}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{airport.city}</Text>
        <Text variant="caption" color="textTertiary" numberOfLines={1}>
          {airport.name}
        </Text>

        {showDistance && (
          <View style={s.distanceRow}>
            <View style={s.distanceTrack}>
              <View
                style={[
                  s.distanceFill,
                  {
                    width: `${fill * 100}%`,
                    backgroundColor:
                      airport.distanceKm < 60 ? palette.success : palette.gray300,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="textTertiary">
              {airport.distanceKm} km
              {airport.driveMinutes > 0 &&
                ` · ${Math.round(airport.driveMinutes / 60)}h drive`}
            </Text>
          </View>
        )}
      </View>

      {selected ? (
        <Feather name="check-circle" size={20} color={palette.primary500} />
      ) : (
        <Feather name="chevron-right" size={18} color={palette.gray300} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.sheet,
  },
  drag: {
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: HPAD,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.primary200,
    backgroundColor: palette.primary50,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 68,
  },
  detectFound: {
    borderColor: palette.success,
    backgroundColor: palette.successLight,
  },
  detectIconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  radar: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.primary400,
  },
  detectIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: { letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 64,
  },
  rowOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  rowPressed: { backgroundColor: palette.gray50 },
  code: {
    width: 46,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeOn: { backgroundColor: palette.primary500 },

  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  distanceTrack: {
    width: 52,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.gray100,
    overflow: 'hidden',
  },
  distanceFill: { height: 3, borderRadius: 2 },
});
