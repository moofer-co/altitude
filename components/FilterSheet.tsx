import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import { BAND_LABEL, BAND_RANGE, getBand, type Band } from './../lib/flightAnalysis';

export interface FlightFilters {
  maxStops: number | null;
  refundable: boolean;
  bands: Set<Band>;
  carriers: Set<string>;
  /** Exclude itineraries booked on separate tickets */
  noSelfTransfer: boolean;
  /** Exclude anything landing on a later day */
  noOvernight: boolean;
}

export const emptyFlightFilters = (): FlightFilters => ({
  maxStops: null,
  refundable: false,
  bands: new Set<Band>(),
  carriers: new Set<string>(),
  noSelfTransfer: false,
  noOvernight: false,
});

export function countActive(f: FlightFilters): number {
  return (
    (f.maxStops !== null ? 1 : 0) +
    (f.refundable ? 1 : 0) +
    f.bands.size +
    f.carriers.size +
    (f.noSelfTransfer ? 1 : 0) +
    (f.noOvernight ? 1 : 0)
  );
}

export function applyFlightFilters(
  flights: MockFlight[],
  f: FlightFilters,
): MockFlight[] {
  return flights.filter((flight) => {
    if (f.maxStops !== null && flight.stops > f.maxStops) return false;
    if (f.refundable && !flight.refundable) return false;
    if (f.bands.size > 0 && !f.bands.has(getBand(flight.departTime))) return false;
    if (f.carriers.size > 0 && !flight.carriers.some((c) => f.carriers.has(c.code)))
      return false;
    if (f.noSelfTransfer && flight.layovers.some((l) => l.selfTransfer)) return false;
    if (f.noOvernight && flight.arrivalDayOffset > 0) return false;
    return true;
  });
}

const BANDS: Band[] = ['early', 'morning', 'afternoon', 'evening', 'night'];

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
  const [draft, setDraft] = useState<FlightFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const carriers = useMemo(() => {
    const map = new Map<string, { code: string; name: string; color: string }>();
    flights.forEach((f) => f.carriers.forEach((c) => map.set(c.code, c)));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [flights]);

  const matches = useMemo(
    () => applyFlightFilters(flights, draft).length,
    [flights, draft],
  );

  const count = (fn: (f: MockFlight) => boolean) => flights.filter(fn).length;

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      subtitle={`${matches} of ${flights.length} flights match`}
      heightRatio={0.88}
      footer={
        <View style={s.footer}>
          <Pressable
            style={s.reset}
            onPress={() => setDraft(emptyFlightFilters())}
          >
            <Text variant="bodySmall" color="textSecondary">
              Reset
            </Text>
          </Pressable>
          <Pressable
            style={[s.apply, matches === 0 && s.applyOff]}
            onPress={() => matches > 0 && onApply(draft)}
            disabled={matches === 0}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {matches === 0 ? 'No matches' : `Show ${matches}`}
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Stops */}
        <Group title="Stops">
          <View style={s.chips}>
            {[
              { label: 'Direct only', value: 0 },
              { label: 'Up to 1 stop', value: 1 },
              { label: 'Any', value: null },
            ].map((opt) => (
              <Chip
                key={String(opt.value)}
                label={opt.label}
                count={
                  opt.value === null
                    ? flights.length
                    : count((f) => f.stops <= opt.value!)
                }
                active={draft.maxStops === opt.value}
                onPress={() => setDraft((d) => ({ ...d, maxStops: opt.value }))}
              />
            ))}
          </View>
        </Group>

        {/* Departure */}
        <Group title="Departure time">
          <View style={s.chips}>
            {BANDS.map((b) => (
              <Chip
                key={b}
                label={BAND_LABEL[b]}
                sub={BAND_RANGE[b]}
                count={count((f) => getBand(f.departTime) === b)}
                active={draft.bands.has(b)}
                onPress={() =>
                  setDraft((d) => ({ ...d, bands: toggleSet(d.bands, b) }))
                }
              />
            ))}
          </View>
        </Group>

        {/* Airlines */}
        <Group title="Airlines">
          <View style={s.chips}>
            {carriers.map((c) => (
              <Chip
                key={c.code}
                label={c.name}
                count={count((f) => f.carriers.some((x) => x.code === c.code))}
                active={draft.carriers.has(c.code)}
                dotColor={c.color}
                onPress={() =>
                  setDraft((d) => ({ ...d, carriers: toggleSet(d.carriers, c.code) }))
                }
              />
            ))}
          </View>
        </Group>

        {/* Journey quality */}
        <Group title="Journey">
          <Toggle
            icon="rotate-ccw"
            label="Refundable fares only"
            hint="Cancel and get money back"
            count={count((f) => f.refundable)}
            active={draft.refundable}
            onPress={() => setDraft((d) => ({ ...d, refundable: !d.refundable }))}
          />
          <Toggle
            icon="shield"
            label="Protected connections only"
            hint="Excludes separate tickets with no rebooking cover"
            count={count((f) => !f.layovers.some((l) => l.selfTransfer))}
            active={draft.noSelfTransfer}
            onPress={() =>
              setDraft((d) => ({ ...d, noSelfTransfer: !d.noSelfTransfer }))
            }
          />
          <Toggle
            icon="sun"
            label="Arrive the same day"
            hint="Excludes overnight arrivals"
            count={count((f) => f.arrivalDayOffset === 0)}
            active={draft.noOvernight}
            onPress={() => setDraft((d) => ({ ...d, noOvernight: !d.noOvernight }))}
            last
          />
        </Group>
      </ScrollView>
    </Sheet>
  );
}

// ─── Pieces ──────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.group}>
      <Text variant="label" color="textTertiary" style={s.groupTitle}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  sub,
  count,
  active,
  dotColor,
  onPress,
}: {
  label: string;
  sub?: string;
  count: number;
  active: boolean;
  dotColor?: string;
  onPress: () => void;
}) {
  const empty = count === 0;
  return (
    <Pressable
      style={[s.chip, active && s.chipOn, empty && s.chipEmpty]}
      onPress={onPress}
      disabled={empty}
    >
      {dotColor && <View style={[s.dot, { backgroundColor: dotColor }]} />}
      <View>
        <Text
          variant="caption"
          style={{
            color: active ? palette.white : empty ? palette.gray400 : palette.gray900,
            fontWeight: active ? '600' : '400',
          }}
        >
          {label} ({count})
        </Text>
        {sub && (
          <Text
            variant="caption"
            style={{ color: active ? 'rgba(255,255,255,0.75)' : palette.gray500 }}
          >
            {sub}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function Toggle({
  icon,
  label,
  hint,
  count,
  active,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  hint: string;
  count: number;
  active: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[s.toggle, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={s.toggleIcon}>
        <Feather name={icon as never} size={16} color={palette.gray600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmall">
          {label} ({count})
        </Text>
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      </View>
      <View style={[s.switch, active && s.switchOn]}>
        <View style={[s.knob, active && s.knobOn]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  group: { marginBottom: spacing.xl },
  groupTitle: { letterSpacing: 1, marginBottom: spacing.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },
  chipEmpty: { backgroundColor: palette.gray50, borderColor: palette.gray100 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    minHeight: 68,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray200,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: palette.primary500 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.white,
  },
  knobOn: { alignSelf: 'flex-end' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reset: {
    minHeight: 52,
    paddingHorizontal: layout.screenPadding,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
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
