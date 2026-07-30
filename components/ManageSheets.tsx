import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import {
  refundQuote,
  dateChangeOptions,
  timeOf,
  dateOf,
  type Trip,
  type TripPassenger,
  type DateOption,
  type RefundBreakdown,
} from '../data/trip';

// ═══════════════════════════════════════════════════════════
// Change travel date
// ═══════════════════════════════════════════════════════════

export function DateChangeSheet({
  visible,
  trip,
  now,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  trip: Trip;
  now: number;
  onClose: () => void;
  onConfirm: (option: DateOption) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = useMemo(() => dateChangeOptions(trip, now), [trip, now]);
  const seg = trip.segments[0];

  useEffect(() => {
    if (visible) setPicked(null);
  }, [visible]);

  const chosen = options.find((o) => o.iso === picked) ?? null;
  const cost = chosen ? chosen.fareDelta + chosen.changeFee : 0;
  const anyCheckedIn = trip.passengers.some((p) => p.checkedIn);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Change travel date"
      subtitle={`Currently ${dateOf(seg.departISO)} · ${timeOf(seg.departISO)}`}
      heightRatio={0.86}
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textTertiary">
              {chosen
                ? cost >= 0
                  ? 'You pay'
                  : 'Refunded to you'
                : 'Pick a date'}
            </Text>
            {chosen && (
              <Text style={s.total}>₹{Math.abs(cost).toLocaleString()}</Text>
            )}
          </View>
          <Pressable
            style={[s.cta, !chosen && s.ctaOff]}
            onPress={() => chosen && onConfirm(chosen)}
            disabled={!chosen}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Confirm change
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {anyCheckedIn && (
          <View style={[s.notice, { backgroundColor: palette.warningLight }]}>
            <Feather name="alert-triangle" size={14} color={palette.warningDark} />
            <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
              Changing the date cancels your check-in. You will need to check in
              again for the new flight.
            </Text>
          </View>
        )}

        <Text variant="caption" color="textTertiary" style={s.label}>
          AVAILABLE DATES
        </Text>

        {options.map((o) => {
          const on = picked === o.iso;
          const delta = o.fareDelta + o.changeFee;
          const scarce = o.seatsLeft <= 3;
          const enough = o.seatsLeft >= trip.passengers.filter((p) => p.type !== 'infant').length;

          return (
            <Pressable
              key={o.iso}
              style={[s.dateRow, on && s.dateRowOn, !enough && s.dateRowOff]}
              onPress={() => enough && setPicked(o.iso)}
              disabled={!enough}
            >
              <View style={[s.radio, on && s.radioOn]}>
                {on && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={!enough ? { color: palette.gray400 } : undefined}>
                  {dateOf(o.iso)}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: scarce ? palette.warningDark : palette.gray500 }}
                >
                  {!enough
                    ? `Only ${o.seatsLeft} seats — you need more`
                    : scarce
                      ? `Only ${o.seatsLeft} seats left`
                      : `${o.seatsLeft} seats available`}
                </Text>
              </View>
              <Text
                variant="bodySmall"
                style={{
                  color: delta > 0 ? palette.gray900 : palette.successDark,
                  fontWeight: '600',
                }}
              >
                {delta > 0 ? '+' : ''}
                ₹{Math.abs(delta).toLocaleString()}
              </Text>
            </Pressable>
          );
        })}

        {chosen && (
          <View style={s.breakdown}>
            <Line label="Fare difference" amount={chosen.fareDelta} signed />
            <Line label="Change fee" amount={chosen.changeFee} />
            <View style={s.rule} />
            <Line label={cost >= 0 ? 'Total to pay' : 'Total refund'} amount={Math.abs(cost)} bold />
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Update traveller details
// ═══════════════════════════════════════════════════════════

export function TravellerUpdateSheet({
  visible,
  trip,
  onClose,
  onRename,
}: {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onRename: (passengerId: string, name: string) => void;
}) {
  const [editing, setEditing] = useState<TripPassenger | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) {
      setEditing(null);
      setDraft('');
    }
  }, [visible]);

  const startEdit = (p: TripPassenger) => {
    setEditing(p);
    setDraft(p.name);
  };

  const valid = draft.trim().length >= 3 && draft.trim().includes(' ');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Correct name' : 'Update traveller details'}
      subtitle={
        editing
          ? 'Must match the photo ID this traveller carries'
          : 'Corrections only — names must match photo ID'
      }
      heightRatio={editing ? 0.5 : 0.6}
      footer={
        editing ? (
          <View style={s.footer}>
            <Pressable style={s.ghost} onPress={() => setEditing(null)}>
              <Text variant="bodySmall" color="textSecondary">
                Back
              </Text>
            </Pressable>
            <Pressable
              style={[s.cta, { flex: 1 }, !valid && s.ctaOff]}
              onPress={() => {
                if (!valid) return;
                onRename(editing.id, draft.trim());
                setEditing(null);
              }}
              disabled={!valid}
            >
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Save correction
              </Text>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
        {editing ? (
          <>
            <Text variant="caption" color="textSecondary" style={{ marginBottom: 7 }}>
              Full name
            </Text>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="First and last name"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCapitalize="words"
              autoFocus
            />
            <View style={[s.notice, { backgroundColor: palette.warningLight }]}>
              <Feather name="alert-triangle" size={13} color={palette.warningDark} />
              <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
                A name that no longer matches the ID can mean being refused boarding.
                Only fix genuine spelling errors here.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[s.notice, { backgroundColor: palette.infoLight }]}>
              <Feather name="info" size={14} color={palette.infoDark} />
              <Text variant="caption" style={{ color: palette.infoDark, flex: 1 }}>
                Small spelling corrections are usually free. A change of passenger is
                a new booking, not a correction.
              </Text>
            </View>

            {trip.passengers.map((p, i) => (
              <Pressable
                key={p.id}
                style={[s.travRow, i === trip.passengers.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => !p.checkedIn && startEdit(p)}
                disabled={p.checkedIn}
              >
                <View style={s.travMark}>
                  <Text variant="bodySmall" style={{ color: palette.gray700, fontWeight: '700' }}>
                    {p.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={p.checkedIn ? { color: palette.gray400 } : undefined}>
                    {p.name}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {p.type === 'infant' ? 'Infant' : p.type === 'child' ? 'Child' : 'Adult'}
                    {p.checkedIn ? ' · checked in' : ''}
                  </Text>
                </View>
                {p.checkedIn ? (
                  <Feather name="lock" size={15} color={palette.gray300} />
                ) : (
                  <Feather name="chevron-right" size={18} color={palette.gray400} />
                )}
              </Pressable>
            ))}

            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.md }}>
              Checked-in travellers cannot be edited until check-in is cancelled.
            </Text>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Cancel booking
// ═══════════════════════════════════════════════════════════

export function CancelBookingSheet({
  visible,
  trip,
  now,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  trip: Trip;
  now: number;
  onClose: () => void;
  onConfirm: (refund: RefundBreakdown) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const refund = useMemo(() => refundQuote(trip, now), [trip, now]);
  const seg = trip.segments[0];

  useEffect(() => {
    if (visible) setConfirmed(false);
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Cancel booking"
      subtitle={`${seg.marketingFlight} · ${dateOf(seg.departISO)}`}
      heightRatio={0.82}
      footer={
        <Pressable
          style={[s.danger, !confirmed && s.ctaOff]}
          onPress={() => confirmed && onConfirm(refund)}
          disabled={!confirmed}
        >
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
            {confirmed ? 'Cancel this booking' : 'Confirm you understand'}
          </Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={[s.notice, { backgroundColor: palette.errorLight }]}>
          <Feather name="alert-triangle" size={14} color={palette.errorDark} />
          <Text variant="caption" style={{ color: palette.errorDark, flex: 1 }}>
            This cancels the flight for everyone on the booking. It cannot be undone.
          </Text>
        </View>

        <Text variant="caption" color="textTertiary" style={s.label}>
          WHAT YOU GET BACK
        </Text>

        <View style={s.breakdown}>
          <Line label="Fare refunded" amount={refund.fareRefunded} />
          <Line label="Taxes refunded" amount={refund.taxesRefunded} />
          <Line label="Cancellation fee" amount={-refund.cancellationFee} signed />
          <View style={s.rule} />
          <Line label="Refund to your account" amount={refund.net} bold />
        </View>

        {refund.extrasForfeited > 0 && (
          <View style={s.notice}>
            <Feather name="x-circle" size={13} color={palette.gray600} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              ₹{refund.extrasForfeited.toLocaleString()} in extras is non-refundable
              and will not be returned.
            </Text>
          </View>
        )}

        <View style={s.notice}>
          <Feather name="clock" size={13} color={palette.gray600} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Refunds reach the original payment method in 5 to 7 working days.
          </Text>
        </View>

        <Pressable
          style={[s.confirm, confirmed && s.confirmOn]}
          onPress={() => setConfirmed((v) => !v)}
        >
          <View style={[s.box, confirmed && s.boxOn]}>
            {confirmed && <Feather name="check" size={14} color={palette.white} />}
          </View>
          <Text variant="bodySmall" style={{ flex: 1 }}>
            I understand the refund shown and that this cannot be undone
          </Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

// ─── Shared ──────────────────────────────────────────────

function Line({
  label,
  amount,
  bold,
  signed,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  signed?: boolean;
}) {
  const neg = amount < 0;
  return (
    <View style={s.line}>
      <Text
        variant={bold ? 'bodyMedium' : 'bodySmall'}
        color={bold ? 'text' : 'textSecondary'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Text
        variant={bold ? 'bodyMedium' : 'bodySmall'}
        style={neg ? { color: palette.gray600 } : undefined}
      >
        {signed && !neg ? '+' : neg ? '−' : ''}₹{Math.abs(amount).toLocaleString()}
      </Text>
    </View>
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

  dateRow: {
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
  dateRowOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  dateRowOff: { backgroundColor: palette.gray50, borderColor: palette.gray100 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: palette.primary500 },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: palette.primary500 },

  travRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  travMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  breakdown: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginVertical: spacing.sm,
  },

  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    minHeight: 60,
  },
  confirmOn: { borderColor: palette.error, backgroundColor: palette.errorLight },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: palette.error, borderColor: palette.error },

  input: {
    ...typography.body,
    color: palette.gray900,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
  },
  ghost: {
    minHeight: 52,
    paddingHorizontal: layout.screenPadding,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
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
  danger: {
    minHeight: 52,
    backgroundColor: palette.error,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
