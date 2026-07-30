import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import type { PickKind } from '../lib/flightAnalysis';
import {
  bestFareFor,
  stopsLabel,
  formatMins,
  advisoriesFor,
  type PaxMix,
} from '../lib/flightRules';

const PICK_LABEL: Record<PickKind, string> = {
  bestValue: 'Best value',
  cheapest: 'Cheapest',
  fastest: 'Fastest',
};

/**
 * Preview a Top Pick before committing — times, stops, price, then confirm.
 */
export function PickConfirmSheet({
  visible,
  kind,
  flight,
  pax,
  confirmLabel = 'Select this flight',
  onClose,
  onConfirm,
}: {
  visible: boolean;
  kind: PickKind | null;
  flight: MockFlight | null;
  pax: PaxMix;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!flight || !kind) {
    return (
      <Sheet visible={false} onClose={onClose} title="">
        <View />
      </Sheet>
    );
  }

  const best = bestFareFor(flight, pax);
  const total = best ? best.quote.total : flight.price;
  const advisories = advisoriesFor(flight, pax).slice(0, 2);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={PICK_LABEL[kind]}
      subtitle="Review this option before you choose it"
      heightRatio={0.62}
      footer={
        <View style={s.footer}>
          <Pressable style={s.ghost} onPress={onClose}>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: palette.gray700 }}>
              Not this one
            </Text>
          </Pressable>
          <Pressable style={s.confirm} onPress={onConfirm}>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: palette.white }}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.carrier}>
          <View style={[s.logo, { backgroundColor: flight.airlineColor }]}>
            <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
              {flight.airlineCode}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
              {flight.airline}
            </Text>
            <Text variant="caption" color="textTertiary">
              {flight.flightNumber} · {best?.fare.name ?? 'Economy'}
            </Text>
          </View>
          <Text style={s.price}>₹{total.toLocaleString()}</Text>
        </View>

        <View style={s.times}>
          <View style={s.timeCol}>
            <Text style={s.time}>{flight.departTime}</Text>
            <Text variant="caption" color="textTertiary">
              {flight.origin}
            </Text>
          </View>
          <View style={s.mid}>
            <Text variant="caption" color="textTertiary" align="center">
              {flight.duration}
            </Text>
            <View style={s.line} />
            <Text variant="caption" color="textTertiary" align="center">
              {stopsLabel(flight)}
            </Text>
          </View>
          <View style={[s.timeCol, { alignItems: 'flex-end' }]}>
            <Text style={s.time}>
              {flight.arriveTime}
              {flight.arrivalDayOffset > 0 ? (
                <Text style={s.plus}> +{flight.arrivalDayOffset}</Text>
              ) : null}
            </Text>
            <Text variant="caption" color="textTertiary">
              {flight.destination}
            </Text>
          </View>
        </View>

        <View style={s.meta}>
          <Meta icon="briefcase" text={flight.baggage} />
          <Meta icon="coffee" text={flight.meal} />
          <Meta
            icon="clock"
            text={`${formatMins(flight.durationMin)} total`}
          />
          {flight.refundable && <Meta icon="refresh-cw" text="Refundable fare" />}
        </View>

        {advisories.length > 0 && (
          <View style={s.notes}>
            {advisories.map((a) => (
              <View key={a.id} style={s.note}>
                <Feather
                  name="info"
                  size={14}
                  color={
                    a.level === 'warning'
                      ? palette.error
                      : a.level === 'caution'
                        ? palette.warningDark
                        : palette.infoDark
                  }
                />
                <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  {a.title}
                  {a.detail ? ` — ${a.detail}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.metaItem}>
      <Feather name={icon as never} size={13} color={palette.gray500} />
      <Text variant="caption" color="textSecondary">
        {text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  carrier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.gray900,
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  timeCol: { minWidth: 64 },
  time: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 28,
  },
  plus: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.gray500,
  },
  mid: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  line: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray300,
  },
  meta: { gap: spacing.sm },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notes: { gap: spacing.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghost: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  confirm: {
    flex: 1.4,
    minHeight: 52,
    borderRadius: radii.full,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
