import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '../components/ui';
import { layout, palette, spacing, radii, typography, shadows } from '../constants/tokens';
import { PassengerSheet } from '../components/PassengerSheet';
import { ExtrasSheet, type ExtraKind } from '../components/ExtrasSheet';
import { SeatSheet } from '../components/SeatSheet';
import { KeyboardBottomPad } from '../components/KeyboardBottomPad';
import { useKeyboardLift } from '../hooks/useKeyboardLift';
import {
  passengerName,
  isComplete,
  validateContact,
  buildTripQuote,
  firstBlocker,
  passengersReady,
  seatPrice,
  meals,
  baggage,
  payMethods,
  PASSENGER_LABEL,
  emptyPassenger,
  type Passenger,
  type Contact,
  type PayMethod,
} from '../data/booking';
import {
  resolveBookingItinerary,
  seedPassengers,
  tripModeLabel,
  type BookingSegment,
} from '../data/bookingItinerary';
import {
  getLinkedLoyalty,
  subscribeLoyalty,
  updateLoyaltyPoints,
  redeemableForBooking,
  clampRedemption,
  altitudeEarnPoints,
  type AppliedRedemption,
  type RedemptionOption,
} from '../data/loyalty';
import { shortPax } from '../lib/flightRules';

const HPAD = layout.screenPadding;

let seq = 0;
const nextId = () => `p${++seq}`;

export default function Booking() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    legs?: string;
    trip?: string;
    adults?: string;
    children?: string;
    infants?: string;
    total?: string;
  }>();

  const itinerary = useMemo(() => resolveBookingItinerary(params), [params]);

  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    seedPassengers(itinerary.pax, nextId),
  );
  const [contact, setContact] = useState<Contact>({ email: '', phone: '' });
  const [contactTouched, setContactTouched] = useState(false);
  const [method, setMethod] = useState<PayMethod | null>(null);

  const [summaryOpen, setSummaryOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [editing, setEditing] = useState<Passenger | null>(null);
  const [editIndex, setEditIndex] = useState(0);
  const [extras, setExtras] = useState<ExtraKind | null>(null);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const openedFirst = useRef(false);

  const [linked, setLinked] = useState(getLinkedLoyalty);
  const [applied, setApplied] = useState<AppliedRedemption[]>([]);

  useEffect(() => subscribeLoyalty(() => setLinked(getLinkedLoyalty())), []);

  // Open the first passenger sheet once so the page starts on identity details.
  useEffect(() => {
    if (openedFirst.current) return;
    openedFirst.current = true;
    const first = passengers[0];
    if (first && !isComplete(first)) {
      const t = setTimeout(() => {
        setEditIndex(0);
        setEditing(first);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [passengers]);

  const scrollRef = useRef<ScrollView>(null);
  const keyboardLift = useKeyboardLift();

  const animate = () =>
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const paxDone = passengersReady(passengers);

  const flightLabel =
    itinerary.segments.length > 1
      ? `${tripModeLabel(itinerary.mode)} · ${itinerary.segments.length} flights`
      : 'Flight';

  const quote = useMemo(
    () => buildTripQuote(passengers, itinerary.flightTotal, flightLabel),
    [passengers, itinerary.flightTotal, flightLabel],
  );

  useEffect(() => {
    setApplied((list) =>
      list.filter((a) => {
        const opt = redeemableForBooking(
          getLinkedLoyalty(),
          itinerary.marketingCode,
          quote.total || 1,
        ).find((o) => o.programId === a.programId);
        return !!opt;
      }),
    );
  }, [itinerary.marketingCode, quote.total]);

  const redeemOptions = useMemo(
    () => redeemableForBooking(linked, itinerary.marketingCode, quote.total),
    [linked, itinerary.marketingCode, quote.total],
  );

  const redeemValue = applied.reduce((n, a) => n + a.value, 0);
  const payable = Math.max(0, quote.total - redeemValue);

  const contactErrors = useMemo(() => validateContact(contact), [contact]);
  const blocker = useMemo(
    () => firstBlocker(passengers, contact, method),
    [passengers, contact, method],
  );

  const openIncompletePassenger = useCallback(() => {
    const idx = passengers.findIndex((p) => !isComplete(p));
    if (idx >= 0) {
      setEditIndex(idx);
      setEditing(passengers[idx]);
      return;
    }
    if (passengers.length === 0) {
      const p = emptyPassenger('adult', nextId());
      setEditIndex(0);
      setEditing(p);
    }
  }, [passengers]);

  const addPassenger = useCallback(() => {
    const p = emptyPassenger('adult', nextId());
    setEditIndex(passengers.length);
    setEditing(p);
  }, [passengers.length]);

  const savePassenger = useCallback((p: Passenger) => {
    animate();
    setPassengers((list) => {
      const i = list.findIndex((x) => x.id === p.id);
      return i === -1 ? [...list, p] : list.map((x) => (x.id === p.id ? p : x));
    });
    setEditing(null);
  }, []);

  const removePassenger = useCallback((id: string) => {
    animate();
    setPassengers((list) => list.filter((p) => p.id !== id));
    setEditing(null);
  }, []);

  const seatSummary = useMemo(() => {
    const chosen = passengers.filter((p) => p.seat);
    if (chosen.length === 0) return null;
    const cost = passengers.reduce((n, p) => n + seatPrice(p.seat), 0);
    return `${chosen.map((p) => p.seat).join(', ')} · ₹${cost.toLocaleString()}`;
  }, [passengers]);

  const mealSummary = useMemo(() => {
    const chosen = passengers.filter((p) => p.mealId && p.mealId !== 'none');
    if (chosen.length === 0) return null;
    const cost = chosen.reduce(
      (n, p) => n + (meals.find((m) => m.id === p.mealId)?.price ?? 0),
      0,
    );
    return `${chosen.length} meal${chosen.length > 1 ? 's' : ''} · ₹${cost.toLocaleString()}`;
  }, [passengers]);

  const baggageSummary = useMemo(() => {
    const chosen = passengers.filter((p) => p.baggageId && p.baggageId !== 'included');
    if (chosen.length === 0) return null;
    const cost = chosen.reduce(
      (n, p) => n + (baggage.find((b) => b.id === p.baggageId)?.price ?? 0),
      0,
    );
    return `${chosen.length} added · ₹${cost.toLocaleString()}`;
  }, [passengers]);

  const assistSummary = useMemo(() => {
    const n = passengers.reduce((sum, p) => sum + p.assistance.length, 0);
    return n === 0 ? null : `${n} request${n > 1 ? 's' : ''}`;
  }, [passengers]);

  const handlePay = useCallback(() => {
    setAttempted(true);
    if (!paxDone) {
      openIncompletePassenger();
      return;
    }
    if (blocker) {
      setContactTouched(true);
      if (blocker.kind === 'contact' || blocker.kind === 'payment') {
        scrollRef.current?.scrollToEnd({ animated: true });
      } else {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      return;
    }
    for (const a of applied) {
      if (a.points > 0) updateLoyaltyPoints(a.programId, -a.points);
    }
    const earn = altitudeEarnPoints(payable);
    if (earn > 0) updateLoyaltyPoints('altitude', earn);
    setEarnedPoints(earn);
    animate();
    setPaid(true);
  }, [blocker, applied, payable, paxDone, openIncompletePassenger]);

  const toggleRedeem = (opt: RedemptionOption) => {
    animate();
    setApplied((list) => {
      const existing = list.find((a) => a.programId === opt.programId);
      if (existing && existing.points > 0) {
        return list.filter((a) => a.programId !== opt.programId);
      }
      const next = clampRedemption(opt, opt.maxPoints);
      return [next];
    });
  };

  const primarySeg = itinerary.segments[0];
  const incompleteCount = passengers.filter((p) => !isComplete(p)).length;

  if (paid) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.done}>
          <View style={s.doneIcon}>
            <Feather name="check" size={30} color={palette.white} />
          </View>
          <Text variant="h1" align="center">
            Booking confirmed
          </Text>
          <Text variant="bodySmall" color="textSecondary" align="center">
            We have sent the ticket to {contact.email}
          </Text>
          <View style={s.doneCard}>
            <Text variant="caption" color="textTertiary">
              {itinerary.subtitle} · {primarySeg?.dateLabel}
            </Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {itinerary.title}
            </Text>
            {itinerary.segments.map((seg) => (
              <Text
                key={seg.legId}
                variant="caption"
                color="textSecondary"
                style={{ marginTop: 4 }}
              >
                {seg.label}: {seg.flightNumber} · {seg.depart}–{seg.arrive}
              </Text>
            ))}
            <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
              {passengers.length} passenger{passengers.length > 1 ? 's' : ''} · ₹
              {payable.toLocaleString()}
              {redeemValue > 0 ? ` paid · ₹${redeemValue.toLocaleString()} in points` : ''}
            </Text>
            {earnedPoints > 0 && (
              <View style={s.earnRow}>
                <Feather name="award" size={14} color={palette.primary600} />
                <Text variant="caption" style={{ color: palette.primary700, flex: 1 }}>
                  +{earnedPoints.toLocaleString()} Altitude Rewards points earned
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={s.doneCta}
            onPress={() => router.replace('/itinerary')}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              View your trip
            </Text>
            <Feather name="arrow-right" size={17} color={palette.white} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Feather name="chevron-left" size={21} color={palette.gray900} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h2">Review and pay</Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {itinerary.subtitle} · {shortPax(itinerary.pax)}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scroll,
          keyboardLift > 0 && { paddingBottom: spacing.xl + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── Trip summary ── */}
        <Pressable
          style={s.flight}
          onPress={() => {
            animate();
            setSummaryOpen((v) => !v);
          }}
        >
          <View
            style={[
              s.airline,
              { backgroundColor: primarySeg?.airlineColor ?? palette.primary600 },
            ]}
          >
            <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
              {itinerary.segments.length > 1
                ? itinerary.segments.length
                : primarySeg?.airlineCode ?? '—'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{itinerary.title}</Text>
            <Text variant="caption" color="textTertiary">
              {itinerary.segments.length === 1
                ? `${primarySeg.dateLabel} · ${primarySeg.depart} · ${primarySeg.fareName}`
                : `${itinerary.subtitle} · ₹${itinerary.flightTotal.toLocaleString()}`}
            </Text>
          </View>
          <Feather
            name={summaryOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.gray400}
          />
        </Pressable>

        {summaryOpen && (
          <View style={s.flightDetail}>
            {itinerary.segments.map((seg, i) => (
              <SegmentDetail
                key={seg.legId}
                segment={seg}
                last={i === itinerary.segments.length - 1}
              />
            ))}
          </View>
        )}

        {/* ── Passengers first ── */}
        <SectionLabel>PASSENGERS</SectionLabel>
        <Text variant="caption" color="textTertiary" style={s.sectionNote}>
          Names must match the ID used at the airport. Add these before seats and payment.
        </Text>

        {passengers.length === 0 ? (
          <Pressable
            style={[s.empty, attempted && s.emptyBlocked]}
            onPress={addPassenger}
          >
            <View style={s.emptyIcon}>
              <Feather name="user-plus" size={20} color={palette.primary600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Add the first passenger</Text>
              <Text variant="caption" color="textTertiary">
                We need traveller details to continue
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.gray400} />
          </Pressable>
        ) : (
          <>
            {passengers.map((p, i) => {
              const complete = isComplete(p);
              return (
                <Pressable
                  key={p.id}
                  style={[s.passenger, !complete && attempted && s.passengerBlocked]}
                  onPress={() => {
                    setEditIndex(i);
                    setEditing(p);
                  }}
                >
                  <View style={[s.pIndex, complete && s.pIndexOk]}>
                    {complete ? (
                      <Feather name="check" size={14} color={palette.white} />
                    ) : (
                      <Text
                        variant="caption"
                        style={{ color: palette.gray600, fontWeight: '700' }}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {complete
                        ? `${p.title} ${passengerName(p)}`
                        : passengerName(p)}
                    </Text>
                    <Text variant="caption" color="textTertiary" numberOfLines={1}>
                      {complete
                        ? [
                            PASSENGER_LABEL[p.type],
                            p.seat && `Seat ${p.seat}`,
                            p.mealId &&
                              p.mealId !== 'none' &&
                              meals.find((m) => m.id === p.mealId)?.name,
                            p.assistance.length > 0 && 'Assistance requested',
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Tap to complete details'}
                    </Text>
                  </View>

                  {!complete && (
                    <View style={s.warn}>
                      <Feather name="alert-circle" size={13} color={palette.warningDark} />
                    </View>
                  )}
                  <Feather name="chevron-right" size={18} color={palette.gray400} />
                </Pressable>
              );
            })}

            <Pressable style={s.addRow} onPress={addPassenger}>
              <Feather name="plus" size={17} color={palette.primary600} />
              <Text variant="bodySmall" style={{ color: palette.primary600, fontWeight: '600' }}>
                Add another passenger
              </Text>
            </Pressable>
          </>
        )}

        {!paxDone && (
          <View style={s.nextHint}>
            <Feather name="lock" size={14} color={palette.gray500} />
            <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
              Seats, extras, contact and payment unlock after passenger details are complete
              {incompleteCount > 0 ? ` (${incompleteCount} left)` : ''}.
            </Text>
          </View>
        )}

        {/* ── Rest of checkout — only after passengers are ready ── */}
        {paxDone && (
          <>
            <SectionLabel>EXTRAS</SectionLabel>
            <Text variant="caption" color="textTertiary" style={s.sectionNote}>
              Optional — you can skip and choose at check-in
            </Text>

            <View style={s.extras}>
              <ExtraRow
                icon="grid"
                label="Seats"
                value={seatSummary}
                fallback="Assigned free at check-in"
                onPress={() => setSeatsOpen(true)}
              />
              <ExtraRow
                icon="coffee"
                label="Meals"
                value={mealSummary}
                fallback="Buy on board"
                onPress={() => setExtras('meal')}
              />
              <ExtraRow
                icon="briefcase"
                label="Extra baggage"
                value={baggageSummary}
                fallback="15 kg included"
                onPress={() => setExtras('baggage')}
              />
              <ExtraRow
                icon="heart"
                label="Special assistance"
                value={assistSummary}
                fallback="Wheelchair, medical and more"
                onPress={() => setExtras('assistance')}
                last
              />
            </View>

            <SectionLabel>CONTACT</SectionLabel>
            <Text variant="caption" color="textTertiary" style={s.sectionNote}>
              Ticket and airline updates go here
            </Text>

            <View style={s.field}>
              <TextInput
                style={[
                  s.input,
                  contactTouched && contactErrors.email && s.inputError,
                ]}
                value={contact.email}
                onChangeText={(v) => setContact((c) => ({ ...c, email: v }))}
                onBlur={() => setContactTouched(true)}
                placeholder="Email address"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {contactTouched && contactErrors.email && (
                <ErrorLine text={contactErrors.email} />
              )}
            </View>

            <View style={s.field}>
              <View style={s.phoneRow}>
                <View style={s.dial}>
                  <Text variant="bodySmall">+91</Text>
                </View>
                <TextInput
                  style={[
                    s.input,
                    s.phoneInput,
                    contactTouched && contactErrors.phone && s.inputError,
                  ]}
                  value={contact.phone}
                  onChangeText={(v) =>
                    setContact((c) => ({
                      ...c,
                      phone: v.replace(/\D/g, '').slice(0, 10),
                    }))
                  }
                  onBlur={() => setContactTouched(true)}
                  placeholder="Mobile number"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                />
              </View>
              {contactTouched && contactErrors.phone && (
                <ErrorLine text={contactErrors.phone} />
              )}
            </View>

            <SectionLabel>PAYMENT</SectionLabel>

            <View style={s.extras}>
              {payMethods.map((m, i) => (
                <Pressable
                  key={m.id}
                  style={[s.payRow, i === payMethods.length - 1 && { borderBottomWidth: 0 }]}
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
            </View>

            <View style={s.secure}>
              <Feather name="lock" size={13} color={palette.gray500} />
              <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
                Card and UPI details are collected on the next screen by the payment
                provider.
              </Text>
            </View>

            <SectionLabel>LOYALTY</SectionLabel>
            <View style={s.extras}>
              {redeemOptions.length === 0 ? (
                <View style={s.loyaltyEmpty}>
                  <Feather name="award" size={16} color={palette.gray500} />
                  <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
                    Link Altitude Rewards or an airline programme in Account to redeem
                    here. Airline points only apply when that carrier markets the flight.
                  </Text>
                </View>
              ) : (
                redeemOptions.map((opt, i) => {
                  const active = applied.find((a) => a.programId === opt.programId);
                  const on = !!(active && active.points > 0);
                  return (
                    <Pressable
                      key={opt.programId}
                      style={[
                        s.payRow,
                        i === redeemOptions.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => toggleRedeem(opt)}
                    >
                      <View
                        style={[s.payIcon, { backgroundColor: opt.program.color + '22' }]}
                      >
                        <Feather
                          name={opt.program.kind === 'platform' ? 'award' : 'navigation'}
                          size={17}
                          color={opt.program.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{opt.program.programName}</Text>
                        <Text variant="caption" color="textTertiary">
                          {opt.balance.toLocaleString()} pts · up to ₹
                          {opt.maxValue.toLocaleString()}
                          {opt.program.kind === 'airline'
                            ? ` · ${opt.program.airlineName} only`
                            : ' · any Altitude booking'}
                        </Text>
                      </View>
                      <View style={[s.radio, on && s.radioOn]}>
                        {on && <Feather name="check" size={13} color={palette.white} />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
            {redeemValue > 0 && (
              <Text variant="caption" color="textTertiary" style={s.loyaltyHint}>
                Applying ₹{redeemValue.toLocaleString()} in points. You pay ₹
                {payable.toLocaleString()} today.
              </Text>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {priceOpen && (
        <View style={s.breakdown}>
          {quote.lines.map((l) => (
            <View key={l.label} style={s.breakLine}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall">{l.label}</Text>
                {l.note && (
                  <Text variant="caption" color="textTertiary">
                    {l.note}
                  </Text>
                )}
              </View>
              <Text variant="bodySmall">₹{l.amount.toLocaleString()}</Text>
            </View>
          ))}
          {paxDone &&
            applied
              .filter((a) => a.value > 0)
              .map((a) => {
                const opt = redeemOptions.find((o) => o.programId === a.programId);
                return (
                  <View key={a.programId} style={s.breakLine}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall">
                        {opt?.program.programName ?? 'Loyalty'} redemption
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {a.points.toLocaleString()} points
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: palette.successDark }}>
                      −₹{a.value.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
        </View>
      )}

      <KeyboardBottomPad style={s.barChrome}>
        <View style={s.bar}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              animate();
              setPriceOpen((v) => !v);
            }}
          >
            <View style={s.totalRow}>
              <Text variant="caption" color="textTertiary">
                {!paxDone
                  ? 'Trip total'
                  : redeemValue > 0
                    ? 'You pay'
                    : 'Total'}
              </Text>
              <Feather
                name={priceOpen ? 'chevron-down' : 'chevron-up'}
                size={13}
                color={palette.gray500}
              />
            </View>
            <Text style={s.total}>₹{payable.toLocaleString()}</Text>
          </Pressable>

          <Pressable
            style={[s.pay, paxDone && blocker && s.payBlocked]}
            onPress={handlePay}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {!paxDone
                ? 'Add passenger details'
                : blocker
                  ? 'Continue'
                  : `Pay ₹${payable.toLocaleString()}`}
            </Text>
            {paxDone && !blocker && (
              <Feather name="arrow-right" size={17} color={palette.white} />
            )}
          </Pressable>
        </View>

        {attempted && paxDone && blocker && (
          <View style={s.blockerBar}>
            <Feather name="alert-circle" size={14} color={palette.white} />
            <Text variant="caption" style={{ color: palette.white, flex: 1 }}>
              {blocker.message}
            </Text>
          </View>
        )}
      </KeyboardBottomPad>

      <PassengerSheet
        visible={editing !== null}
        passenger={editing}
        index={editIndex}
        international={itinerary.international}
        departISO={itinerary.departISO}
        onClose={() => setEditing(null)}
        onSave={(p, _doc) => savePassenger(p)}
        onRemove={
          editing && passengers.some((p) => p.id === editing.id)
            ? removePassenger
            : undefined
        }
      />

      <SeatSheet
        visible={seatsOpen}
        passengers={passengers}
        onClose={() => setSeatsOpen(false)}
        onApply={(next) => {
          animate();
          setPassengers(next);
          setSeatsOpen(false);
        }}
      />

      <ExtrasSheet
        kind={extras ?? 'meal'}
        visible={extras !== null}
        passengers={passengers}
        onClose={() => setExtras(null)}
        onApply={(next) => {
          animate();
          setPassengers(next);
          setExtras(null);
        }}
      />
    </SafeAreaView>
  );
}

function SegmentDetail({
  segment,
  last,
}: {
  segment: BookingSegment;
  last: boolean;
}) {
  const stopsLabel =
    segment.stops === 0
      ? 'Direct'
      : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`;
  return (
    <View style={[s.segmentBlock, !last && s.segmentBlockGap]}>
      <Text variant="caption" color="textTertiary" style={{ fontWeight: '600' }}>
        {segment.label}
      </Text>
      <Text variant="bodySmall" style={{ fontWeight: '600', marginTop: 2 }}>
        {segment.from} → {segment.to}
      </Text>
      <DetailLine
        label="Flight"
        value={`${segment.airline} · ${segment.flightNumber}`}
      />
      <DetailLine
        label="Departs"
        value={`${segment.dateLabel} · ${segment.depart} · ${segment.fromCity} (${segment.originTerminal})`}
      />
      <DetailLine
        label="Arrives"
        value={`${segment.arrive}${segment.arriveOffset > 0 ? ` +${segment.arriveOffset}` : ''} · ${segment.toCity} (${segment.destTerminal})`}
      />
      <DetailLine label="Duration" value={`${segment.duration} · ${stopsLabel}`} />
      <DetailLine
        label="Fare"
        value={
          segment.refundable
            ? `${segment.fareName} · Refundable`
            : segment.fareName
        }
      />
      <DetailLine label="Price" value={`₹${segment.price.toLocaleString()}`} />
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="label" color="textTertiary" style={s.sectionLabel}>
      {children}
    </Text>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailLine}>
      <Text variant="caption" color="textTertiary" style={{ width: 72 }}>
        {label}
      </Text>
      <Text variant="caption" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <View style={s.errorLine}>
      <Feather name="alert-circle" size={12} color={palette.error} />
      <Text variant="caption" style={{ color: palette.error }}>
        {text}
      </Text>
    </View>
  );
}

function ExtraRow({
  icon,
  label,
  value,
  fallback,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  value: string | null;
  fallback: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[s.extraRow, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={s.extraIcon}>
        <Feather name={icon as never} size={17} color={palette.gray600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text
          variant="caption"
          style={{ color: value ? palette.primary600 : palette.gray500 }}
          numberOfLines={1}
        >
          {value ?? fallback}
        </Text>
      </View>
      <View style={s.extraAction}>
        <Feather
          name={value ? 'edit-2' : 'plus'}
          size={15}
          color={palette.primary600}
        />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: HPAD, paddingTop: spacing.md },

  flight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 64,
  },
  airline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightDetail: {
    backgroundColor: palette.gray50,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  segmentBlock: {},
  segmentBlockGap: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  detailLine: { flexDirection: 'row', paddingVertical: 4 },

  sectionLabel: { letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionNote: { marginTop: -spacing.xs, marginBottom: spacing.md },

  nextHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
  },

  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.primary300,
    backgroundColor: palette.primary50,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 72,
  },
  emptyBlocked: { borderColor: palette.warning, backgroundColor: palette.warningLight },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passenger: {
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
  passengerBlocked: { borderColor: palette.warning, backgroundColor: palette.warningLight },
  pIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pIndexOk: { backgroundColor: palette.success },
  warn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
  },

  extras: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  extraIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: { marginBottom: spacing.md },
  input: {
    ...typography.body,
    color: palette.gray900,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: palette.error },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  dial: {
    width: 62,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray50,
  },
  phoneInput: { flex: 1 },
  errorLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
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

  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  loyaltyEmpty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loyaltyHint: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  breakdown: {
    backgroundColor: palette.gray50,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  breakLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },

  barChrome: {
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    ...shadows.floating,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  total: {
    ...typography.h2,
    color: palette.gray900,
    marginTop: 2,
  },
  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  payBlocked: { backgroundColor: palette.gray400 },

  blockerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.warningDark,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
  },

  done: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: HPAD,
    gap: spacing.md,
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  doneCard: {
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  doneCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    minHeight: 52,
    marginTop: spacing.lg,
  },
});
