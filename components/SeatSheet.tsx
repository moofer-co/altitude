import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  SEAT_ROWS,
  SEAT_LETTERS,
  seatZone,
  isSeatTaken,
  seatPrice,
  type Passenger,
} from '../data/booking';

const { width: SW } = Dimensions.get('window');
const HPAD = layout.screenPadding;

const SEAT = 38;
const GAP = 5;
const AISLE = 26;
const ROW_LABEL_W = 22;
const DECK_W = ROW_LABEL_W + SEAT * 6 + GAP * 4 + AISLE;

export function SeatSheet({
  visible,
  passengers,
  onClose,
  onApply,
  complimentary = false,
}: {
  visible: boolean;
  passengers: Passenger[];
  onClose: () => void;
  onApply: (next: Passenger[]) => void;
  /** Premium / flex fares — seats are free */
  complimentary?: boolean;
}) {
  const [draft, setDraft] = useState<Passenger[]>(passengers);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (visible) {
      setDraft(passengers);
      // Land on the first passenger still without a seat
      const firstOpen = passengers.findIndex((p) => !p.seat);
      setActive(firstOpen === -1 ? 0 : firstOpen);
    }
  }, [visible, passengers]);

  // Who is sitting where, so a seat taken by passenger 1 is not offered to 2
  const claimed = useMemo(() => {
    const map = new Map<string, number>();
    draft.forEach((p, i) => {
      if (p.seat) map.set(p.seat, i);
    });
    return map;
  }, [draft]);

  const current = draft[active];
  const total = draft.reduce(
    (sum, p) => sum + seatPrice(p.seat, complimentary),
    0,
  );
  const seated = draft.filter((p) => p.seat).length;

  if (!current) {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Choose seats"
        subtitle="Add a passenger first"
        heightRatio={0.4}
      >
        <View style={s.empty}>
          <Feather name="users" size={26} color={palette.gray300} />
          <Text variant="bodySmall" color="textSecondary" align="center">
            Seats are assigned per passenger.
          </Text>
        </View>
      </Sheet>
    );
  }

  const pick = (seatId: string) => {
    const owner = claimed.get(seatId);

    setDraft((d) =>
      d.map((p, i) => {
        // Tapping your own seat clears it
        if (i === active) {
          return { ...p, seat: p.seat === seatId ? null : seatId };
        }
        // Taking a seat from someone else releases theirs
        if (owner === i) return { ...p, seat: null };
        return p;
      }),
    );

    // Move along to the next unseated passenger
    if (claimed.get(seatId) !== active && current.seat !== seatId) {
      const next = draft.findIndex((p, i) => i !== active && !p.seat);
      if (next !== -1) setActive(next);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Choose seats"
      subtitle={
        complimentary
          ? 'Complimentary with your fare — pick now or after booking'
          : 'Optional — we will assign seats free at check-in'
      }
      heightRatio={0.9}
      headerAccessory={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
        >
          {draft.map((p, i) => {
            const on = i === active;
            return (
              <Pressable
                key={p.id}
                style={[s.tab, on && s.tabOn]}
                onPress={() => setActive(i)}
              >
                <Text
                  variant="caption"
                  style={{
                    color: on ? palette.white : palette.gray700,
                    fontWeight: on ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {p.firstName || `Passenger ${i + 1}`}
                </Text>
                <View style={[s.tabSeat, on && s.tabSeatOn]}>
                  <Text
                    variant="caption"
                    style={{
                      color: on ? palette.white : p.seat ? palette.primary600 : palette.gray400,
                      fontWeight: '700',
                    }}
                  >
                    {p.seat ?? '—'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      }
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textTertiary">
              {seated} of {draft.length} seated
            </Text>
            <Text variant="bodyMedium">
              {complimentary
                ? 'Complimentary'
                : total === 0
                  ? 'No charge'
                  : `₹${total.toLocaleString()}`}
            </Text>
          </View>
          <Pressable style={s.done} onPress={() => onApply(draft)}>
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Done
            </Text>
          </Pressable>
        </View>
      }
    >
      {/* Legend */}
      <View style={s.legend}>
        <Legend color={palette.successLight} border={palette.success} label="Extra legroom" />
        <Legend color={palette.primary50} border={palette.primary300} label="Front" />
        <Legend color={palette.white} border={palette.gray300} label="Standard" />
        <Legend color={palette.gray200} border={palette.gray200} label="Taken" />
      </View>

      <ScrollView
        contentContainerStyle={s.deck}
        showsVerticalScrollIndicator={false}
      >
        {/* Column letters */}
        <View style={s.letterRow}>
          <View style={{ width: ROW_LABEL_W }} />
          {SEAT_LETTERS.map((l, i) => (
            <View
              key={l}
              style={[
                { width: SEAT, marginRight: i === 2 ? AISLE : i === 5 ? 0 : GAP },
              ]}
            >
              <Text variant="caption" color="textTertiary" align="center">
                {l}
              </Text>
            </View>
          ))}
        </View>

        {Array.from({ length: SEAT_ROWS }, (_, r) => {
          const row = r + 1;
          const zone = seatZone(row);

          return (
            <View key={row}>
              {zone.zone === 'extraLegroom' && (
                <View style={s.zoneTag}>
                  <Feather name="maximize-2" size={11} color={palette.successDark} />
                  <Text variant="caption" style={{ color: palette.successDark }}>
                    {zone.label}
                    {complimentary ? ' · Complimentary' : ` · ₹${zone.price.toLocaleString()}`}
                  </Text>
                </View>
              )}

              <View style={s.seatRow}>
                <View style={{ width: ROW_LABEL_W }}>
                  <Text variant="caption" color="textTertiary">
                    {row}
                  </Text>
                </View>

                {SEAT_LETTERS.map((letter, i) => {
                  const id = `${row}${letter}`;
                  const taken = isSeatTaken(row, letter);
                  const owner = claimed.get(id);
                  const mine = owner === active;
                  const theirs = owner !== undefined && owner !== active;

                  return (
                    <Pressable
                      key={id}
                      disabled={taken}
                      onPress={() => pick(id)}
                      style={[
                        s.seat,
                        {
                          marginRight: i === 2 ? AISLE : i === 5 ? 0 : GAP,
                        },
                        zone.zone === 'extraLegroom' && s.seatLegroom,
                        zone.zone === 'front' && s.seatFront,
                        taken && s.seatTaken,
                        theirs && s.seatTheirs,
                        mine && s.seatMine,
                      ]}
                    >
                      {taken ? (
                        <Feather name="x" size={13} color={palette.gray400} />
                      ) : mine ? (
                        <Feather name="check" size={15} color={palette.white} />
                      ) : theirs ? (
                        <Text
                          variant="caption"
                          style={{ color: palette.primary600, fontWeight: '700' }}
                        >
                          {(draft[owner].firstName || 'P').charAt(0).toUpperCase()}
                        </Text>
                      ) : (
                        <Text variant="caption" color="textTertiary">
                          {zone.price >= 1000 ? '₹₹' : zone.price >= 500 ? '₹' : ''}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

function Legend({
  color,
  border,
  label,
}: {
  color: string;
  border: string;
  label: string;
}) {
  return (
    <View style={s.legendItem}>
      <View style={[s.swatch, { backgroundColor: color, borderColor: border }]} />
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingLeft: spacing.md,
    paddingRight: 6,
    minHeight: 40,
    maxWidth: 180,
  },
  tabOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },
  tabSeat: {
    minWidth: 34,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabSeatOn: { backgroundColor: palette.gray700 },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },

  deck: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: (SW - DECK_W) / 2 > 0 ? (SW - DECK_W) / 2 : spacing.sm,
  },
  letterRow: { flexDirection: 'row', marginBottom: spacing.sm },
  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: GAP },

  zoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: ROW_LABEL_W,
    marginTop: spacing.sm,
    marginBottom: 5,
  },

  seat: {
    width: SEAT,
    height: SEAT,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatFront: { backgroundColor: palette.primary50, borderColor: palette.primary300 },
  seatLegroom: { backgroundColor: palette.successLight, borderColor: palette.success },
  seatTaken: { backgroundColor: palette.gray200, borderColor: palette.gray200 },
  seatMine: { backgroundColor: palette.primary500, borderColor: palette.primary500 },
  seatTheirs: { borderColor: palette.primary400, borderWidth: 2 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  done: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
