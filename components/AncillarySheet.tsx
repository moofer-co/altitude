import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  ancillaryAvailable,
  type Ancillary,
  type CartItem,
  type Trip,
} from '../data/trip';

export function AncillarySheet({
  visible,
  item,
  trip,
  now,
  existing,
  onClose,
  onAdd,
  onRemove,
}: {
  visible: boolean;
  item: Ancillary | null;
  trip: Trip;
  now: number;
  /** Already in the basket, so the sheet opens showing that selection */
  existing: CartItem | null;
  onClose: () => void;
  onAdd: (entry: CartItem) => void;
  onRemove: (ancillaryId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  // Lap infants hold no seat, bag allowance or lounge pass
  const eligible = useMemo(
    () => trip.passengers.filter((p) => p.type !== 'infant'),
    [trip.passengers],
  );

  useEffect(() => {
    if (!visible) return;
    setSelected(existing ? existing.passengerIds : eligible.map((p) => p.id));
  }, [visible, existing, eligible]);

  if (!item) return null;

  const seg = trip.segments[0];
  const count = item.perPassenger ? selected.length : 1;
  const subtotal = item.price * count;
  const saving = item.airportPrice ? (item.airportPrice - item.price) * count : 0;
  const stillAvailable = ancillaryAvailable(item, seg.departISO, now);

  const affectsCheckedIn =
    item.id === 'seat' &&
    selected.some((id) => trip.passengers.find((p) => p.id === id)?.checkedIn);

  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const commit = () => {
    if (count === 0 || !stillAvailable) return;
    onAdd({
      ancillaryId: item.id,
      name: item.name,
      passengerIds: selected,
      unitPrice: item.price,
      subtotal,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={item.name}
      subtitle={item.blurb}
      heightRatio={0.78}
      footer={
        <View style={s.footer}>
          {existing && (
            <Pressable style={s.remove} onPress={() => onRemove(item.id)} hitSlop={6}>
              <Feather name="trash-2" size={18} color={palette.error} />
            </Pressable>
          )}
          <Pressable
            style={[s.cta, (count === 0 || !stillAvailable) && s.ctaOff]}
            onPress={commit}
            disabled={count === 0 || !stillAvailable}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {!stillAvailable
                ? 'Cut-off has passed'
                : count === 0
                  ? 'Select a traveller'
                  : existing
                    ? `Update · ₹${subtotal.toLocaleString()}`
                    : `Add · ₹${subtotal.toLocaleString()}`}
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {!stillAvailable && (
          <View style={[s.notice, { backgroundColor: palette.errorLight }]}>
            <Feather name="clock" size={14} color={palette.errorDark} />
            <Text variant="caption" style={{ color: palette.errorDark, flex: 1 }}>
              This closed {item.cutoffHours} hours before departure and can no
              longer be added online.
            </Text>
          </View>
        )}

        {saving > 0 && stillAvailable && (
          <View style={[s.notice, { backgroundColor: palette.successLight }]}>
            <Feather name="trending-down" size={14} color={palette.successDark} />
            <Text variant="caption" style={{ color: palette.successDark, flex: 1 }}>
              ₹{saving.toLocaleString()} less than buying it at the airport
            </Text>
          </View>
        )}

        {item.perPassenger && (
          <>
            <Text variant="caption" color="textTertiary" style={s.label}>
              ADD FOR
            </Text>

            {eligible.map((p) => {
              const on = selected.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[s.row, on && s.rowOn]}
                  onPress={() => toggle(p.id)}
                >
                  <View style={[s.box, on && s.boxOn]}>
                    {on && <Feather name="check" size={14} color={palette.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{p.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      {p.checkedIn ? 'Checked in · ' : ''}
                      {p.seat ? `Seat ${p.seat}` : 'No seat assigned'}
                    </Text>
                  </View>
                  <Text variant="bodySmall" color="textSecondary">
                    ₹{item.price.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}

            {trip.passengers.some((p) => p.type === 'infant') && (
              <View style={s.notice}>
                <Feather name="info" size={13} color={palette.gray600} />
                <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  Not available for infants travelling on a lap.
                </Text>
              </View>
            )}
          </>
        )}

        {affectsCheckedIn && (
          <View style={[s.notice, { backgroundColor: palette.warningLight }]}>
            <Feather name="refresh-cw" size={13} color={palette.warningDark} />
            <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
              Changing a seat after check-in reissues that boarding pass. The old
              one stops being valid.
            </Text>
          </View>
        )}

        <View style={s.notice}>
          <Feather name="shopping-bag" size={13} color={palette.gray600} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Nothing is charged yet. Add everything you want, then pay once from the
            bar at the bottom of your trip.
          </Text>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  label: { letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 68,
  },
  rowOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  remove: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: palette.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flex: 1,
    minHeight: 52,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: { backgroundColor: palette.gray400 },
});
