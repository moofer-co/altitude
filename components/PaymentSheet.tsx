import { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import { payMethods, type PayMethod } from '../data/booking';
import {
  cartSubtotal,
  cartTax,
  cartTotal,
  ancillaries,
  ancillaryAvailable,
  type CartItem,
  type Trip,
} from '../data/trip';

type Step = 'review' | 'processing' | 'done' | 'failed';

export function PaymentSheet({
  visible,
  cart,
  trip,
  now,
  onClose,
  onPaid,
  onDropExpired,
}: {
  visible: boolean;
  cart: CartItem[];
  trip: Trip;
  now: number;
  onClose: () => void;
  onPaid: (method: string) => void;
  onDropExpired: (ancillaryIds: string[]) => void;
}) {
  const [step, setStep] = useState<Step>('review');
  const [method, setMethod] = useState<PayMethod | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('review');
      setMethod(null);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const seg = trip.segments[0];

  // A cut-off can pass while items sit in the basket
  const expired = cart.filter((c) => {
    const a = ancillaries.find((x) => x.id === c.ancillaryId);
    return a ? !ancillaryAvailable(a, seg.departISO, now) : false;
  });

  const subtotal = cartSubtotal(cart);
  const tax = cartTax(cart);
  const total = cartTotal(cart);

  const pay = () => {
    if (!method || expired.length > 0) return;
    setStep('processing');
    timer.current = setTimeout(() => {
      const declined = Math.random() < 0.12;
      if (declined) {
        setStep('failed');
      } else {
        setStep('done');
        onPaid(payMethods.find((m) => m.id === method)!.name);
      }
    }, 1600);
  };

  const footer =
    step === 'review' ? (
      <View style={s.footerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="textTertiary">
            Total including taxes
          </Text>
          <Text style={s.total}>₹{total.toLocaleString()}</Text>
        </View>
        <Pressable
          style={[s.cta, (!method || expired.length > 0) && s.ctaOff]}
          onPress={pay}
          disabled={!method || expired.length > 0}
        >
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
            {expired.length > 0
              ? 'Remove expired'
              : method
                ? 'Pay now'
                : 'Choose a method'}
          </Text>
        </Pressable>
      </View>
    ) : step === 'failed' ? (
      <View style={s.footerRow}>
        <Pressable style={s.ghost} onPress={onClose}>
          <Text variant="bodySmall" color="textSecondary">
            Cancel
          </Text>
        </Pressable>
        <Pressable style={[s.cta, { flex: 1 }]} onPress={() => setStep('review')}>
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
            Try again
          </Text>
        </Pressable>
      </View>
    ) : step === 'done' ? (
      <Pressable style={[s.cta, { flex: 1 }]} onPress={onClose}>
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          Done
        </Text>
      </Pressable>
    ) : undefined;

  return (
    <Sheet
      visible={visible}
      onClose={step === 'processing' ? () => {} : onClose}
      title={
        step === 'done'
          ? 'Extras added'
          : step === 'failed'
            ? 'Payment declined'
            : step === 'processing'
              ? 'Taking payment'
              : 'Pay for your extras'
      }
      subtitle={
        step === 'review'
          ? `${cart.length} item${cart.length > 1 ? 's' : ''} · booking ${trip.pnr}`
          : undefined
      }
      heightRatio={0.82}
      footer={footer}
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {step === 'review' && (
          <>
            {expired.length > 0 && (
              <Pressable
                style={[s.notice, { backgroundColor: palette.errorLight }]}
                onPress={() => onDropExpired(expired.map((e) => e.ancillaryId))}
              >
                <Feather name="clock" size={14} color={palette.errorDark} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: palette.errorDark, fontWeight: '600' }}>
                    {expired.length === 1 ? 'One item' : `${expired.length} items`} passed
                    their cut-off
                  </Text>
                  <Text variant="caption" style={{ color: palette.errorDark }}>
                    {expired.map((e) => e.name).join(', ')} · tap to remove and continue
                  </Text>
                </View>
              </Pressable>
            )}

            <View style={s.breakdown}>
              {cart.map((c) => (
                <View key={c.ancillaryId} style={s.line}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall">{c.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      {c.passengerIds.length} traveller
                      {c.passengerIds.length > 1 ? 's' : ''} × ₹
                      {c.unitPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text variant="bodySmall">₹{c.subtotal.toLocaleString()}</Text>
                </View>
              ))}

              <View style={s.line}>
                <Text variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                  Subtotal
                </Text>
                <Text variant="bodySmall">₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={s.line}>
                <Text variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                  Taxes and fees
                </Text>
                <Text variant="bodySmall">₹{tax.toLocaleString()}</Text>
              </View>

              <View style={s.rule} />

              <View style={s.line}>
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  Total
                </Text>
                <Text variant="bodyMedium">₹{total.toLocaleString()}</Text>
              </View>
            </View>

            <Text variant="caption" color="textTertiary" style={s.label}>
              PAY WITH
            </Text>

            {payMethods.map((m) => (
              <Pressable
                key={m.id}
                style={[s.row, method === m.id && s.rowOn]}
                onPress={() => setMethod(m.id)}
              >
                <View style={s.payIcon}>
                  <Feather name={m.icon as never} size={17} color={palette.gray600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{m.name}</Text>
                  <Text variant="caption" color="textTertiary">
                    {m.note}
                  </Text>
                </View>
                <View style={[s.radio, method === m.id && s.radioOn]}>
                  {method === m.id && (
                    <Feather name="check" size={13} color={palette.white} />
                  )}
                </View>
              </Pressable>
            ))}

            <View style={s.notice}>
              <Feather name="lock" size={13} color={palette.gray600} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                Extras are non-refundable unless the airline cancels the flight.
              </Text>
            </View>
          </>
        )}

        {step === 'processing' && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={palette.primary500} />
            <Text variant="bodySmall" color="textSecondary" align="center">
              Confirming with your bank. Do not close this screen.
            </Text>
          </View>
        )}

        {step === 'done' && (
          <View style={s.center}>
            <View style={s.doneIcon}>
              <Feather name="check" size={26} color={palette.white} />
            </View>
            <Text variant="bodySmall" color="textSecondary" align="center">
              ₹{total.toLocaleString()} paid. Your itinerary has been updated and a
              receipt is on its way to {trip.contactEmail}.
            </Text>
          </View>
        )}

        {step === 'failed' && (
          <View style={s.center}>
            <View style={[s.doneIcon, { backgroundColor: palette.error }]}>
              <Feather name="x" size={26} color={palette.white} />
            </View>
            <Text variant="bodySmall" color="textSecondary" align="center">
              Your bank declined the payment. Nothing has been charged and your
              extras are still waiting in the basket.
            </Text>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  label: { letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },

  breakdown: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginVertical: spacing.sm,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.md,
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
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.md,
  },
  doneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  ghost: {
    minHeight: 52,
    paddingHorizontal: layout.screenPadding,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
