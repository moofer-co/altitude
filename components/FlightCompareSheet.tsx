import { useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { layout, palette, spacing, radii, shadows } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import { getDelta } from '../lib/flightAnalysis';

const { height: SH } = Dimensions.get('window');
const HPAD = layout.screenPadding;

const SHEET_H = SH * 0.86;
const DISMISS_AT = SHEET_H * 0.4;

const LABEL_W = 108;
const COL_W = 140;
const ROW_H = 58;
const HEAD_H = 104;
const ACTION_H = 60;

interface Row {
  label: string;
  icon: string;
  value: (f: MockFlight) => string;
  best?: (f: MockFlight, all: MockFlight[]) => boolean;
}

const rows: Row[] = [
  {
    label: 'Departs',
    icon: 'clock',
    value: (f) => `${f.departTime}\n${f.origin} (${f.originTerminal})`,
  },
  {
    label: 'Arrives',
    icon: 'map-pin',
    value: (f) => `${f.arriveTime}\n${f.destination} (${f.destinationTerminal})`,
  },
  {
    label: 'Duration',
    icon: 'trending-up',
    value: (f) => f.duration,
    best: (f, all) => f.durationMin === Math.min(...all.map((x) => x.durationMin)),
  },
  {
    label: 'Stops',
    icon: 'git-commit',
    value: (f) => (f.stops === 0 ? 'Direct' : `${f.stops} · via ${f.stopCity}`),
    best: (f) => f.stops === 0,
  },
  {
    label: 'Refund',
    icon: 'rotate-ccw',
    value: (f) => (f.refundable ? 'Refundable' : 'Non-refundable'),
    best: (f) => f.refundable,
  },
  {
    label: 'Baggage',
    icon: 'briefcase',
    value: (f) => f.baggage,
  },
  {
    label: 'Meal',
    icon: 'coffee',
    value: (f) => f.meal,
    best: (f) => f.meal.toLowerCase().includes('complimentary'),
  },
  {
    label: 'Seat pitch',
    icon: 'maximize-2',
    value: (f) => f.seatPitch,
    best: (f, all) =>
      parseInt(f.seatPitch, 10) === Math.max(...all.map((x) => parseInt(x.seatPitch, 10))),
  },
  {
    label: 'Cancel fee',
    icon: 'x-circle',
    value: (f) => f.cancellation,
  },
];

export function FlightCompareSheet({
  flights,
  visible,
  onClose,
  onPick,
}: {
  flights: MockFlight[];
  visible: boolean;
  onClose: () => void;
  onPick: (flight: MockFlight) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      translateY.setValue(SHEET_H);
    }
  }, [visible, translateY]);

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
        Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_AT || g.vy > 0.8) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    }),
  ).current;

  if (flights.length === 0) return null;

  const cheapest = flights.reduce((a, b) => (b.price < a.price ? b : a));

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
          <View {...pan.panHandlers} style={s.dragZone}>
            <View style={s.handle} />
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ letterSpacing: 1.2 }}>
                  SIDE BY SIDE
                </Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  {flights.length} flights · purple marks the better value
                </Text>
              </View>
              <Pressable style={s.closeBtn} onPress={dismiss} hitSlop={8}>
                <Feather name="x" size={19} color={palette.gray600} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}>
            <View style={s.table}>
              {/* Label column */}
              <View style={s.labelCol}>
                <View style={s.headCell}>
                  <Text variant="caption" color="textTertiary">
                    Compare
                  </Text>
                </View>
                {rows.map((r) => (
                  <View key={r.label} style={s.labelCell}>
                    <Feather name={r.icon as never} size={14} color={palette.gray500} />
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {r.label}
                    </Text>
                  </View>
                ))}
                <View style={s.actionCell} />
              </View>

              {/* Flight columns */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {flights.map((f) => {
                  const delta = getDelta(f, cheapest);
                  return (
                    <View key={f.id} style={s.col}>
                      <View style={s.headCell}>
                        <View style={[s.logo, { backgroundColor: f.airlineColor }]}>
                          <Text style={s.logoText}>{f.airlineCode}</Text>
                        </View>
                        <Text variant="caption" numberOfLines={1} style={{ marginTop: 4 }}>
                          {f.flightNumber}
                        </Text>
                        <Text style={s.price}>₹{f.price.toLocaleString()}</Text>
                        <Text
                          variant="caption"
                          style={{
                            fontSize: 12,
                            color: delta.priceDiff === 0 ? palette.success : palette.gray500,
                          }}
                        >
                          {delta.priceDiff === 0
                            ? 'Cheapest'
                            : `+₹${delta.priceDiff.toLocaleString()}`}
                        </Text>
                      </View>

                      {rows.map((r) => {
                        const isBest = r.best?.(f, flights) ?? false;
                        return (
                          <View key={r.label} style={s.valueCell}>
                            <Text
                              variant="caption"
                              align="center"
                              numberOfLines={3}
                              style={{
                                color: isBest ? palette.primary600 : palette.gray700,
                                fontWeight: isBest ? '600' : '400',
                                fontSize: 12,
                                lineHeight: 15,
                              }}
                            >
                              {r.value(f)}
                            </Text>
                          </View>
                        );
                      })}

                      <View style={s.actionCell}>
                        <Pressable style={s.pickBtn} onPress={() => onPick(f)}>
                          <Text
                            variant="caption"
                            style={{ color: palette.white, fontWeight: '600' }}
                          >
                            Select
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
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
    height: SHEET_H,
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.sheet,
  },
  dragZone: {
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
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
    marginBottom: spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: { flexDirection: 'row', paddingLeft: HPAD, paddingTop: spacing.md },
  labelCol: {
    width: LABEL_W,
    borderRightWidth: 1,
    borderRightColor: palette.gray200,
  },
  headCell: {
    height: HEAD_H,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  labelCell: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
  },
  actionCell: { height: ACTION_H, justifyContent: 'center', paddingRight: spacing.sm },
  col: { width: COL_W, paddingHorizontal: spacing.sm },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: palette.white, fontWeight: '700', fontSize: 12 },
  price: { fontSize: 18, fontWeight: '700', color: palette.gray900, marginTop: 2 },
  valueCell: {
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
    paddingHorizontal: 2,
  },
  pickBtn: {
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    paddingVertical: 7,
    alignItems: 'center',
  },
});
