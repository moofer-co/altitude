import { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { OffersSheet } from './OffersSheet';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import {
  payMethods,
  formatCardNumber,
  formatExpiry,
  maskCardNumber,
  validateCardDraft,
  validateUpiDraft,
  type PayMethod,
  type PaymentSelection,
  type CardDraft,
  type UpiDraft,
} from '../data/booking';
import { offersForMethod, offerById } from '../data/offers';

const HPAD = layout.screenPadding;

/**
 * Pick / configure payment for Review & Pay.
 * Shows method list, then card or UPI details and any live offers.
 */
export function BookingPaymentSheet({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: PaymentSelection | null;
  onClose: () => void;
  onSelect: (next: PaymentSelection) => void;
}) {
  const [method, setMethod] = useState<PayMethod>(selected?.method ?? 'upi');
  const [card, setCard] = useState<CardDraft>({
    holder: '',
    number: '',
    expiry: '',
    cvv: '',
  });
  const [upi, setUpi] = useState<UpiDraft>({ vpa: '' });
  const [offerId, setOfferId] = useState<string | null>(selected?.offerId ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMethod(selected?.method ?? 'upi');
    setOfferId(selected?.offerId ?? null);
    setSubmitted(false);
    setOffersOpen(false);
    setCard({ holder: '', number: '', expiry: '', cvv: '' });
    setUpi(
      selected?.method === 'upi' && selected.detail.includes('@')
        ? { vpa: selected.detail }
        : { vpa: '' },
    );
  }, [visible, selected]);

  const offers = useMemo(() => offersForMethod(method).slice(0, 3), [method]);
  const cardErrors = useMemo(() => validateCardDraft(card), [card]);
  const upiErrors = useMemo(() => validateUpiDraft(upi), [upi]);
  const selectedOffer = offerById(offerId);

  const applyMethod = (id: PayMethod) => {
    setMethod(id);
    setOfferId(null);
    setSubmitted(false);
  };

  const confirm = () => {
    setSubmitted(true);
    if (method === 'card') {
      if (Object.keys(cardErrors).length > 0) return;
      onSelect({
        method: 'card',
        detail: maskCardNumber(card.number),
        offerId,
      });
      return;
    }
    if (method === 'upi') {
      if (Object.keys(upiErrors).length > 0) return;
      onSelect({
        method: 'upi',
        detail: upi.vpa.trim().toLowerCase(),
        offerId,
      });
      return;
    }
    onSelect({
      method: 'netbanking',
      detail: 'All major banks',
      offerId,
    });
  };

  return (
    <>
      <Sheet
        visible={visible && !offersOpen}
        onClose={onClose}
        title="Payment method"
        subtitle="Choose how you pay — offers update for each option"
        heightRatio={0.88}
        footer={
          <Pressable style={s.confirm} onPress={confirm}>
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Use this method
            </Text>
          </Pressable>
        }
      >
      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <Text variant="label" color="textTertiary" style={s.section}>
          METHOD
        </Text>
        <View style={s.list}>
          {payMethods.map((m, i) => {
            const on = method === m.id;
            return (
              <Pressable
                key={m.id}
                style={[s.row, i === payMethods.length - 1 && { borderBottomWidth: 0 }, on && s.rowOn]}
                onPress={() => applyMethod(m.id)}
              >
                <View style={[s.icon, on && s.iconOn]}>
                  <Feather
                    name={m.icon as never}
                    size={17}
                    color={on ? palette.primary600 : palette.gray600}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{m.name}</Text>
                  <Text variant="caption" color="textTertiary">
                    {m.note}
                  </Text>
                </View>
                <View style={[s.radio, on && s.radioOn]}>
                  {on && <Feather name="check" size={13} color={palette.white} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {method === 'upi' && (
          <>
            <Text variant="label" color="textTertiary" style={s.section}>
              UPI ID
            </Text>
            <TextInput
              style={[s.input, submitted && upiErrors.vpa && s.inputError]}
              value={upi.vpa}
              onChangeText={(v) => setUpi({ vpa: v.toLowerCase() })}
              placeholder="name@bank"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            {submitted && upiErrors.vpa && (
              <Text variant="caption" style={s.err}>
                {upiErrors.vpa}
              </Text>
            )}
          </>
        )}

        {method === 'card' && (
          <>
            <Text variant="label" color="textTertiary" style={s.section}>
              CARD DETAILS
            </Text>
            <TextInput
              style={[s.input, submitted && cardErrors.holder && s.inputError]}
              value={card.holder}
              onChangeText={(v) => setCard((c) => ({ ...c, holder: v }))}
              placeholder="Name on card"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCapitalize="words"
            />
            {submitted && cardErrors.holder && (
              <Text variant="caption" style={s.err}>
                {cardErrors.holder}
              </Text>
            )}

            <TextInput
              style={[s.input, s.inputGap, submitted && cardErrors.number && s.inputError]}
              value={card.number}
              onChangeText={(v) =>
                setCard((c) => ({ ...c, number: formatCardNumber(v) }))
              }
              placeholder="Card number"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              keyboardType="number-pad"
            />
            {submitted && cardErrors.number && (
              <Text variant="caption" style={s.err}>
                {cardErrors.number}
              </Text>
            )}

            <View style={s.split}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[s.input, submitted && cardErrors.expiry && s.inputError]}
                  value={card.expiry}
                  onChangeText={(v) =>
                    setCard((c) => ({ ...c, expiry: formatExpiry(v, c.expiry) }))
                  }
                  placeholder="MM/YY"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                />
                {submitted && cardErrors.expiry && (
                  <Text variant="caption" style={s.err}>
                    {cardErrors.expiry}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[s.input, submitted && cardErrors.cvv && s.inputError]}
                  value={card.cvv}
                  onChangeText={(v) =>
                    setCard((c) => ({ ...c, cvv: v.replace(/\D/g, '').slice(0, 4) }))
                  }
                  placeholder="CVV"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                  secureTextEntry
                />
                {submitted && cardErrors.cvv && (
                  <Text variant="caption" style={s.err}>
                    {cardErrors.cvv}
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {method === 'netbanking' && (
          <View style={s.noteBox}>
            <Feather name="info" size={14} color={palette.gray500} />
            <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
              You will pick your bank on the secure payment page after confirming this booking.
            </Text>
          </View>
        )}

        <View style={s.offerHead}>
          <Text variant="label" color="textTertiary" style={{ letterSpacing: 1 }}>
            OFFERS
          </Text>
          <Pressable onPress={() => setOffersOpen(true)} hitSlop={8}>
            <Text variant="caption" style={{ color: palette.primary600, fontWeight: '700' }}>
              View all
            </Text>
          </Pressable>
        </View>

        {selectedOffer && (
          <View style={s.applied}>
            <Feather name="check-circle" size={14} color={palette.successDark} />
            <Text variant="caption" style={{ color: palette.successDark, flex: 1 }}>
              {selectedOffer.title} applied
            </Text>
            <Pressable onPress={() => setOfferId(null)} hitSlop={8}>
              <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                Remove
              </Text>
            </Pressable>
          </View>
        )}

        {offers.length === 0 ? (
          <View style={s.noteBox}>
            <Feather name="tag" size={14} color={palette.gray500} />
            <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
              No offers for this method right now. Browse all in Offers.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {offers.map((o, i) => {
              const on = offerId === o.id;
              return (
                <Pressable
                  key={o.id}
                  style={[
                    s.row,
                    i === offers.length - 1 && { borderBottomWidth: 0 },
                    on && s.rowOn,
                  ]}
                  onPress={() => setOfferId(on ? null : o.id)}
                >
                  <View style={[s.icon, { backgroundColor: palette.warningLight }]}>
                    <Feather name="tag" size={15} color={palette.warningDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{o.title}</Text>
                    <Text variant="caption" color="textTertiary">
                      {o.badge} · {o.note}
                    </Text>
                  </View>
                  <View style={[s.radio, on && s.radioOn]}>
                    {on && <Feather name="check" size={13} color={palette.white} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </Sheet>

      <OffersSheet
        visible={offersOpen}
        onClose={() => setOffersOpen(false)}
        method={method}
        selectedId={offerId}
        onSelect={(offer) => {
          setOfferId(offer?.id ?? null);
          setOffersOpen(false);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: HPAD, paddingBottom: spacing.xl },
  section: { letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  list: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    backgroundColor: palette.white,
  },
  rowOn: { backgroundColor: palette.primary50 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: palette.white },
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
  inputGap: { marginTop: spacing.sm },
  inputError: { borderColor: palette.error },
  split: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  err: { color: palette.error, marginTop: 4 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
  },
  offerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.successLight,
  },
  confirm: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    minHeight: 52,
    marginHorizontal: HPAD,
  },
});
