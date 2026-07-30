import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  ancillaries,
  ancillaryAvailable,
  type Ancillary,
  type CartItem,
  type Trip,
  type TripPassenger,
} from '../data/trip';

/**
 * Opened from a traveller's row, so it starts scoped to that person and
 * quietly offers the rest of the party rather than assuming everyone.
 */
export function TravellerExtrasSheet({
  visible,
  passenger,
  trip,
  cart,
  now,
  onClose,
  onAdd,
}: {
  visible: boolean;
  passenger: TripPassenger | null;
  trip: Trip;
  cart: CartItem[];
  now: number;
  onClose: () => void;
  onAdd: (entries: CartItem[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);

  const seg = trip.segments[0];

  // Lap infants hold no seat, bag allowance or lounge pass
  const eligible = useMemo(
    () => trip.passengers.filter((p) => p.type !== 'infant'),
    [trip.passengers],
  );

  useEffect(() => {
    if (!visible || !passenger) return;
    setChosen([]);
    setPeople([passenger.id]);
  }, [visible, passenger]);

  if (!passenger) return null;

  const others = eligible.filter((p) => p.id !== passenger.id);

  const state = (a: Ancillary) => {
    const owned = trip.services.some(
      (sv) => sv.ancillaryId === a.id && sv.passengerIds.includes(passenger.id),
    );
    const basketed = cart.some(
      (c) => c.ancillaryId === a.id && c.passengerIds.includes(passenger.id),
    );
    const open = ancillaryAvailable(a, seg.departISO, now);
    return { owned, basketed, open };
  };

  const toggleService = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const togglePerson = (id: string) =>
    setPeople((p) => {
      // The traveller this sheet belongs to always stays in
      if (id === passenger.id) return p;
      return p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
    });

  const items = chosen
    .map((id) => ancillaries.find((a) => a.id === id))
    .filter((a): a is Ancillary => Boolean(a));

  const total = items.reduce((n, a) => n + a.price * people.length, 0);

  const commit = () => {
    if (items.length === 0) return;
    onAdd(
      items.map((a) => ({
        ancillaryId: a.id,
        name: a.name,
        passengerIds: people,
        unitPrice: a.price,
        subtotal: a.price * people.length,
      })),
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add extras"
      subtitle={`Starting with ${passenger.name}`}
      heightRatio={0.88}
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textTertiary">
              {items.length === 0
                ? 'Nothing selected'
                : `${items.length} extra${items.length > 1 ? 's' : ''} · ${people.length} traveller${people.length > 1 ? 's' : ''}`}
            </Text>
            <Text style={s.total}>₹{total.toLocaleString()}</Text>
          </View>
          <Pressable
            style={[s.cta, items.length === 0 && s.ctaOff]}
            onPress={commit}
            disabled={items.length === 0}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Add to basket
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Who these apply to */}
        <Text variant="caption" color="textTertiary" style={s.label}>
          ADDING FOR
        </Text>

        <View style={s.chips}>
          <View style={[s.chip, s.chipLocked]}>
            <View style={s.chipMark}>
              <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                {passenger.name.charAt(0)}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: palette.white, fontWeight: '600' }}>
              {passenger.name.split(' ')[0]}
            </Text>
          </View>

          {others.map((o) => {
            const on = people.includes(o.id);
            return (
              <Pressable
                key={o.id}
                style={[s.chip, on && s.chipOn]}
                onPress={() => togglePerson(o.id)}
              >
                <Feather
                  name={on ? 'check' : 'plus'}
                  size={13}
                  color={on ? palette.white : palette.gray600}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    color: on ? palette.white : palette.gray900,
                    fontWeight: on ? '600' : '400',
                  }}
                >
                  {o.name.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {others.length > 0 && people.length === 1 && (
          <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
            Tap a name to add the same extras for them too.
          </Text>
        )}

        {trip.passengers.some((p) => p.type === 'infant') && (
          <View style={s.notice}>
            <Feather name="info" size={13} color={palette.gray600} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Infants travelling on a lap cannot hold extras of their own.
            </Text>
          </View>
        )}

        {/* What to add */}
        <Text variant="caption" color="textTertiary" style={s.label}>
          AVAILABLE EXTRAS
        </Text>

        {ancillaries.map((a) => {
          const { owned, basketed, open } = state(a);
          const on = chosen.includes(a.id);
          const blocked = owned || !open;

          return (
            <Pressable
              key={a.id}
              style={[s.item, on && s.itemOn, blocked && s.itemOff]}
              onPress={() => !blocked && toggleService(a.id)}
              disabled={blocked}
            >
              <View style={[s.itemIcon, on && s.itemIconOn]}>
                <Feather
                  name={a.icon as never}
                  size={17}
                  color={
                    on ? palette.white : blocked ? palette.gray300 : palette.gray600
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  variant="bodyMedium"
                  style={blocked ? { color: palette.gray400 } : undefined}
                >
                  {a.name}
                </Text>
                <Text variant="caption" color="textTertiary" numberOfLines={1}>
                  {owned
                    ? 'Already on this booking'
                    : !open
                      ? `Closed ${a.cutoffHours}h before departure`
                      : basketed
                        ? 'Already in your basket for this traveller'
                        : a.blurb}
                </Text>
              </View>

              {owned ? (
                <Feather name="check-circle" size={18} color={palette.success} />
              ) : !open ? (
                <Feather name="lock" size={16} color={palette.gray300} />
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: on ? palette.primary600 : palette.gray900,
                      fontWeight: '600',
                    }}
                  >
                    ₹{(a.price * people.length).toLocaleString()}
                  </Text>
                  {people.length > 1 && (
                    <Text variant="caption" color="textTertiary">
                      ₹{a.price.toLocaleString()} each
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}

        <View style={s.notice}>
          <Feather name="shopping-bag" size={13} color={palette.gray600} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Nothing is charged yet. Everything lands in the basket at the bottom of
            your trip, and you pay once.
          </Text>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  label: { letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    minHeight: 44,
  },
  chipOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },
  chipLocked: { backgroundColor: palette.primary500, borderColor: palette.primary500 },
  chipMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 72,
  },
  itemOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  itemOff: { backgroundColor: palette.gray50, borderColor: palette.gray100 },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconOn: { backgroundColor: palette.primary500 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { fontSize: 21, fontWeight: '700', color: palette.gray900, lineHeight: 26 },
  cta: {
    minHeight: 52,
    paddingHorizontal: layout.screenPadding,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: { backgroundColor: palette.gray400 },
});
