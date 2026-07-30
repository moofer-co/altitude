import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import type { MockFlight } from '../data/flights';

export type AmenityId =
  | 'baggage'
  | 'meal'
  | 'entertainment'
  | 'power'
  | 'wifi';

export interface FlightFilters {
  maxStops: number | null;
  /** Inclusive floor; null = data minimum */
  priceMin: number | null;
  /** Inclusive ceiling; null = data maximum */
  priceMax: number | null;
  carriers: Set<string>;
  amenities: Set<AmenityId>;
}

export const emptyFlightFilters = (): FlightFilters => ({
  maxStops: null,
  priceMin: null,
  priceMax: null,
  carriers: new Set<string>(),
  amenities: new Set<AmenityId>(),
});

const AMENITIES: Array<{ id: AmenityId; label: string }> = [
  { id: 'baggage', label: 'Baggage' },
  { id: 'meal', label: 'In-Flight Meal' },
  { id: 'entertainment', label: 'In-Flight Entertainment' },
  { id: 'power', label: 'Power & USB Port' },
  { id: 'wifi', label: 'Wi-Fi' },
];

export function flightHasAmenity(flight: MockFlight, id: AmenityId): boolean {
  switch (id) {
    case 'baggage':
      return (
        /\d+\s*kg\s*check-?in/i.test(flight.baggage) &&
        !/cabin only/i.test(flight.baggage)
      );
    case 'meal':
      return /complimentary|included/i.test(flight.meal);
    case 'entertainment':
      return flight.durationMin >= 150 || flight.international;
    case 'power': {
      const pitch = parseInt(flight.seatPitch, 10);
      return (Number.isFinite(pitch) && pitch >= 31) || flight.international;
    }
    case 'wifi':
      return flight.international || flight.durationMin >= 180;
    default:
      return false;
  }
}

export function countActive(f: FlightFilters): number {
  return (
    (f.maxStops !== null ? 1 : 0) +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    f.carriers.size +
    f.amenities.size
  );
}

export function applyFlightFilters(
  flights: MockFlight[],
  f: FlightFilters,
): MockFlight[] {
  return flights.filter((flight) => {
    if (f.maxStops !== null && flight.stops > f.maxStops) return false;
    if (f.priceMin !== null && flight.price < f.priceMin) return false;
    if (f.priceMax !== null && flight.price > f.priceMax) return false;
    if (
      f.carriers.size > 0 &&
      !flight.carriers.some((c) => f.carriers.has(c.code))
    ) {
      return false;
    }
    for (const a of f.amenities) {
      if (!flightHasAmenity(flight, a)) return false;
    }
    return true;
  });
}

function priceBounds(flights: MockFlight[]): { min: number; max: number } {
  if (flights.length === 0) return { min: 0, max: 10000 };
  let min = Infinity;
  let max = 0;
  for (const f of flights) {
    min = Math.min(min, f.price);
    max = Math.max(max, f.price);
  }
  // Round to friendly ₹50 steps
  min = Math.floor(min / 50) * 50;
  max = Math.ceil(max / 50) * 50;
  if (min === max) max = min + 500;
  return { min, max };
}

function snapPrice(n: number): number {
  return Math.round(n / 50) * 50;
}

export function FilterSheet({
  visible,
  filters,
  flights,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: FlightFilters;
  flights: MockFlight[];
  onClose: () => void;
  onApply: (next: FlightFilters) => void;
}) {
  const bounds = useMemo(() => priceBounds(flights), [flights]);
  const [draft, setDraft] = useState<FlightFilters>(filters);

  useEffect(() => {
    if (!visible) return;
    setDraft({
      ...filters,
      carriers: new Set(filters.carriers),
      amenities: new Set(filters.amenities),
    });
  }, [visible, filters]);

  const carriers = useMemo(() => {
    const map = new Map<string, { code: string; name: string; color: string }>();
    flights.forEach((f) => f.carriers.forEach((c) => map.set(c.code, c)));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [flights]);

  const low = draft.priceMin ?? bounds.min;
  const high = draft.priceMax ?? bounds.max;

  const matches = useMemo(
    () => applyFlightFilters(flights, draft).length,
    [flights, draft],
  );

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const setPrice = (nextLow: number, nextHigh: number) => {
    const lo = Math.min(nextLow, nextHigh);
    const hi = Math.max(nextLow, nextHigh);
    setDraft((d) => ({
      ...d,
      priceMin: lo <= bounds.min ? null : lo,
      priceMax: hi >= bounds.max ? null : hi,
    }));
  };

  const allCarriersSelected =
    carriers.length > 0 && carriers.every((c) => draft.carriers.has(c.code));
  const allAmenitiesSelected = AMENITIES.every((a) => draft.amenities.has(a.id));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filter"
      subtitle={`${matches} of ${flights.length} flights match`}
      heightRatio={0.9}
      footer={
        <View style={s.footer}>
          <Pressable
            style={s.reset}
            onPress={() => setDraft(emptyFlightFilters())}
          >
            <Text variant="bodyMedium" style={{ color: palette.primary600, fontWeight: '600' }}>
              Reset
            </Text>
          </Pressable>
          <Pressable
            style={[s.apply, matches === 0 && s.applyOff]}
            onPress={() => matches > 0 && onApply(draft)}
            disabled={matches === 0}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {matches === 0 ? 'No matches' : 'Apply'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView
        style={{ backgroundColor: palette.gray50 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Price */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
              Price Range
            </Text>
            <Text variant="bodySmall" style={{ color: palette.primary600, fontWeight: '600' }}>
              ₹{low.toLocaleString()} – ₹{high.toLocaleString()}
            </Text>
          </View>
          <DualRangeSlider
            min={bounds.min}
            max={bounds.max}
            low={low}
            high={high}
            onChange={setPrice}
          />
          <View style={s.rangeEnds}>
            <Text variant="caption" color="textTertiary">
              ₹{bounds.min.toLocaleString()}
            </Text>
            <Text variant="caption" color="textTertiary">
              ₹{bounds.max.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Stops — compact, from the same reference family */}
        <View style={s.card}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', marginBottom: spacing.md }}>
            Number of Stops
          </Text>
          <View style={s.segments}>
            {[
              { label: 'Direct', value: 0 },
              { label: '1 Stop', value: 1 },
              { label: '2+ Stops', value: 2 },
            ].map((opt) => {
              const on = draft.maxStops === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  style={[s.segment, on && s.segmentOn]}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      maxStops: d.maxStops === opt.value ? null : opt.value,
                    }))
                  }
                >
                  <Text
                    variant="bodySmall"
                    style={{
                      color: on ? palette.primary600 : palette.gray700,
                      fontWeight: on ? '700' : '500',
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Airlines */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
              Airlines
            </Text>
            {carriers.length > 0 && (
              <Pressable
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    carriers: allCarriersSelected
                      ? new Set()
                      : new Set(carriers.map((c) => c.code)),
                  }))
                }
                hitSlop={8}
              >
                <Text
                  variant="bodySmall"
                  style={{ color: palette.primary600, fontWeight: '600' }}
                >
                  {allCarriersSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            )}
          </View>
          {carriers.map((c, i) => {
            const on = draft.carriers.has(c.code);
            return (
              <Pressable
                key={c.code}
                style={[s.row, i === carriers.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    carriers: toggleSet(d.carriers, c.code),
                  }))
                }
              >
                <View style={[s.airlineMark, { backgroundColor: c.color }]}>
                  <Text style={s.airlineMarkText}>{c.code.slice(0, 2)}</Text>
                </View>
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  {c.name}
                </Text>
                <Check on={on} />
              </Pressable>
            );
          })}
        </View>

        {/* Amenities */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
              Amenities
            </Text>
            <Pressable
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  amenities: allAmenitiesSelected
                    ? new Set()
                    : new Set(AMENITIES.map((a) => a.id)),
                }))
              }
              hitSlop={8}
            >
              <Text
                variant="bodySmall"
                style={{ color: palette.primary600, fontWeight: '600' }}
              >
                {allAmenitiesSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </Pressable>
          </View>
          {AMENITIES.map((a, i) => {
            const on = draft.amenities.has(a.id);
            return (
              <Pressable
                key={a.id}
                style={[s.row, i === AMENITIES.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    amenities: toggleSet(d.amenities, a.id),
                  }))
                }
              >
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  {a.label}
                </Text>
                <Check on={on} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <View style={[s.check, on && s.checkOn]}>
      {on && <Feather name="check" size={13} color={palette.white} />}
    </View>
  );
}

/** Dual-thumb price range — pan either handle along the track. */
function DualRangeSlider({
  min,
  max,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const widthRef = useRef(1);
  const [width, setWidth] = useState(1);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const active = useRef<'low' | 'high' | null>(null);

  useEffect(() => {
    lowRef.current = low;
    highRef.current = high;
  }, [low, high]);

  const span = Math.max(1, max - min);
  const toX = useCallback(
    (v: number) => ((v - min) / span) * widthRef.current,
    [min, span],
  );
  const toVal = useCallback(
    (x: number) => {
      const clamped = Math.max(0, Math.min(widthRef.current, x));
      return snapPrice(min + (clamped / widthRef.current) * span);
    },
    [min, span],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = Math.max(1, w);
    setWidth(w);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const dLow = Math.abs(x - toX(lowRef.current));
        const dHigh = Math.abs(x - toX(highRef.current));
        active.current = dLow <= dHigh ? 'low' : 'high';
      },
      onPanResponderMove: (evt) => {
        const v = toVal(evt.nativeEvent.locationX);
        if (active.current === 'low') {
          onChange(Math.min(v, highRef.current), highRef.current);
        } else if (active.current === 'high') {
          onChange(lowRef.current, Math.max(v, lowRef.current));
        }
      },
      onPanResponderRelease: () => {
        active.current = null;
      },
      onPanResponderTerminate: () => {
        active.current = null;
      },
    }),
  ).current;

  const left = toX(low);
  const right = toX(high);

  return (
    <View style={s.sliderWrap} onLayout={onLayout} {...pan.panHandlers}>
      <View style={s.track} />
      <View
        style={[
          s.trackActive,
          { left, width: Math.max(0, right - left) },
        ]}
      />
      <View style={[s.thumb, { left: Math.max(0, left - 12) }]} />
      <View style={[s.thumb, { left: Math.max(0, Math.min(width - 24, right - 12)) }]} />
    </View>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },

  rangeEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },

  sliderWrap: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray200,
  },
  trackActive: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary500,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.primary500,
    top: 2,
    ...({
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    } as const),
  },

  segments: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  segmentOn: {
    borderColor: palette.primary500,
    backgroundColor: palette.primary50,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    minHeight: 52,
  },
  airlineMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airlineMarkText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
  },

  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  checkOn: {
    backgroundColor: palette.primary500,
    borderColor: palette.primary500,
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reset: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apply: {
    flex: 1,
    minHeight: 52,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyOff: { backgroundColor: palette.gray400 },
});
