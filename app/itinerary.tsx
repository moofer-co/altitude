import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Plane } from '../components/ui';
import { layout, palette, spacing, radii, shadows } from '../constants/tokens';
import {
  CheckInSheet,
  BoardingPassSheet,
  UndoCheckInSheet,
} from '../components/CheckInSheet';
import { AncillarySheet } from '../components/AncillarySheet';
import { PaymentSheet } from '../components/PaymentSheet';
import { TravellerExtrasSheet } from '../components/TravellerExtrasSheet';
import {
  DateChangeSheet,
  TravellerUpdateSheet,
  CancelBookingSheet,
} from '../components/ManageSheets';
import {
  trip as initialTrip,
  ancillaries,
  ancillaryAvailable,
  remindersFor,
  tripStatus,
  checkInWindow,
  countdownTo,
  useNow,
  timeOf,
  dateOf,
  longDateOf,
  dayOffset,
  durationLabel,
  STATUS_META,
  canUndoCheckIn,
  partiallyCheckedIn,
  documentsRequired,
  travellerReadiness,
  outstandingCount,
  seatPosition,
  servicesFor,
  cartItemsFor,
  hasExtrasToAdd,
  applyCart,
  applyDateChange,
  applyCancellation,
  refundStages,
  cartTax,
  cartTotal,
  type Trip,
  type Ancillary,
  type CartItem,
  type TripPassenger,
  type ReadinessLevel,
  type TravelDocument,
} from '../data/trip';
import { allTrips } from '../data/trips';

const HPAD = layout.screenPadding;

function tripForPnr(pnr: string | undefined): Trip {
  if (!pnr) return initialTrip;
  return allTrips.find((t) => t.pnr === pnr) ?? initialTrip;
}

const TONE = {
  neutral: { bg: palette.gray100, fg: palette.gray700, dot: palette.gray500 },
  good: { bg: palette.successLight, fg: palette.successDark, dot: palette.success },
  warn: { bg: palette.warningLight, fg: palette.warningDark, dot: palette.warning },
  bad: { bg: palette.errorLight, fg: palette.errorDark, dot: palette.error },
} as const;

export default function Itinerary() {
  const now = useNow();
  const { pnr } = useLocalSearchParams<{ pnr?: string }>();
  const [trip, setTrip] = useState<Trip>(() => tripForPnr(pnr));

  useEffect(() => {
    setTrip(tripForPnr(typeof pnr === 'string' ? pnr : undefined));
  }, [pnr]);
  const [expandedSeg, setExpandedSeg] = useState<number | null>(0);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [ancillary, setAncillary] = useState<Ancillary | null>(null);
  const [undoOpen, setUndoOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [extrasFor, setExtrasFor] = useState<TripPassenger | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reissue, setReissue] = useState(false);
  const [openPayment, setOpenPayment] = useState<string | null>(null);
  const [openTraveller, setOpenTraveller] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seg = trip.segments[0];
  const last = trip.segments[trip.segments.length - 1];
  const status = tripStatus(trip, now);
  const win = checkInWindow(seg);
  const meta = STATUS_META[status];
  const tone = TONE[meta.tone];

  const toDeparture = countdownTo(seg.departISO, now);
  const toCheckIn = countdownTo(new Date(win.opensAt).toISOString(), now);
  const reminders = useMemo(() => remindersFor(trip), [trip]);

  const animate = () =>
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    animate();
    setToast(msg);
    toastTimer.current = setTimeout(() => {
      animate();
      setToast(null);
    }, 2800);
  }, []);

  const completeCheckIn = useCallback(
    (ids: string[], docs: TravelDocument[]) => {
      setReissue(false);
      setTrip((t) => ({
        ...t,
        documents: [
          ...t.documents.filter((d) => !ids.includes(d.passengerId)),
          ...docs,
        ],
        passengers: t.passengers.map((p, i) =>
          ids.includes(p.id)
            ? { ...p, checkedIn: true, boardingSequence: 40 + i }
            : p,
        ),
      }));
    },
    [],
  );

  const undoCheckIn = useCallback(
    (ids: string[]) => {
      animate();
      setTrip((t) => ({
        ...t,
        passengers: t.passengers.map((p) =>
          ids.includes(p.id)
            ? { ...p, checkedIn: false, boardingSequence: null }
            : p,
        ),
      }));
      setUndoOpen(false);
      setReissue(false);
      flash(
        ids.length === 1
          ? 'Check-in cancelled — the seat has been released'
          : `Check-in cancelled for ${ids.length} travellers`,
      );
    },
    [flash],
  );

  const addToCart = useCallback((entry: CartItem) => {
    animate();
    setCart((c) => [
      ...c.filter((x) => x.ancillaryId !== entry.ancillaryId),
      entry,
    ]);
    setAncillary(null);
  }, []);

  const addManyToCart = useCallback((entries: CartItem[]) => {
    animate();
    setCart((c) => {
      const next = [...c];
      for (const entry of entries) {
        const i = next.findIndex((x) => x.ancillaryId === entry.ancillaryId);
        if (i === -1) {
          next.push(entry);
        } else {
          // Union the traveller lists rather than overwriting
          const ids = [...new Set([...next[i].passengerIds, ...entry.passengerIds])];
          next[i] = {
            ...next[i],
            passengerIds: ids,
            subtotal: next[i].unitPrice * ids.length,
          };
        }
      }
      return next;
    });
    setExtrasFor(null);
  }, []);

  const removeFromCart = useCallback((ancillaryId: string) => {
    animate();
    setCart((c) => c.filter((x) => x.ancillaryId !== ancillaryId));
    setAncillary(null);
  }, []);

  const settle = useCallback(
    (method: string) => {
      setTrip((t) => {
        const result = applyCart(t, cart, method);
        if (result.reissueNeeded) setReissue(true);
        return result.trip;
      });
      setCart([]);
    },
    [cart],
  );

  const changeDate = useCallback((option: import('../data/trip').DateOption) => {
    animate();
    setTrip((t) => applyDateChange(t, option));
    setDateOpen(false);
    setReissue(false);
    flash('Travel date changed — please check in again for the new flight');
  }, [flash]);

  const renameTraveller = useCallback((id: string, name: string) => {
    animate();
    setTrip((t) => ({
      ...t,
      passengers: t.passengers.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    flash('Name corrected');
  }, [flash]);

  const cancelBooking = useCallback(
    (refund: import('../data/trip').RefundBreakdown) => {
      animate();
      setTrip((t) => applyCancellation(t, refund));
      setCart([]);
      setReissue(false);
      setCancelOpen(false);
      flash(`Booking cancelled — ₹${refund.net.toLocaleString()} will be refunded`);
    },
    [flash],
  );

  // ── What the primary action should be right now ──
  const primary = useMemo(() => {
    switch (status) {
      case 'cancelled':
        return {
          label: 'Booking cancelled',
          sub: 'A refund has been recorded below',
          icon: 'x-circle' as const,
          enabled: false,
          onPress: () => {},
        };
      case 'confirmed':
        return {
          label: 'Check-in opens soon',
          sub: `Opens ${toCheckIn.label} from now`,
          icon: 'clock' as const,
          enabled: false,
          onPress: () => {},
        };
      case 'checkinOpen':
        return {
          label: 'Web check-in',
          sub: `Closes ${countdownTo(new Date(win.closesAt).toISOString(), now).label} before departure`,
          icon: 'check-square' as const,
          enabled: true,
          onPress: () => setCheckInOpen(true),
        };
      case 'checkedIn':
      case 'boarding':
        return {
          label: 'View boarding pass',
          sub:
            status === 'boarding'
              ? 'Boarding now — head to the gate'
              : `Gate closes ${countdownTo(new Date(win.gateClosesAt).toISOString(), now).label} from now`,
          icon: 'credit-card' as const,
          enabled: true,
          onPress: () => setPassOpen(true),
        };
      case 'checkinClosed':
        return {
          label: 'Check in at the airport',
          sub: 'Online check-in has closed for this flight',
          icon: 'map-pin' as const,
          enabled: false,
          onPress: () => {},
        };
      case 'departed':
        return {
          label: 'In the air',
          sub: `Lands at ${timeOf(last.arriveISO)}`,
          icon: 'navigation' as const,
          enabled: false,
          onPress: () => {},
        };
      case 'arrived':
        return {
          label: 'Trip completed',
          sub: 'Hope it went well',
          icon: 'check-circle' as const,
          enabled: false,
          onPress: () => {},
        };
    }
  }, [status, toCheckIn.label, win, now, last.arriveISO]);

  const overnight = dayOffset(seg.departISO, last.arriveISO);
  const anyCheckedIn = trip.passengers.some((p) => p.checkedIn);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.circle} onPress={() => {}}>
          <Feather name="chevron-left" size={21} color={palette.gray900} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h2">Your trip</Text>
          <Text variant="caption" color="textTertiary">
            Booking {trip.pnr}
          </Text>
        </View>
        <Pressable style={s.circle} onPress={() => flash('Support opens in a later release')}>
          <Feather name="help-circle" size={19} color={palette.gray600} />
        </Pressable>
      </View>

      {toast && (
        <View style={s.toast}>
          <Feather name="info" size={14} color={palette.gray600} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            {toast}
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status ── */}
        <View style={s.statusRow}>
          <View style={[s.statusChip, { backgroundColor: tone.bg }]}>
            <View style={[s.statusDot, { backgroundColor: tone.dot }]} />
            <Text variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
              {meta.label.toUpperCase()}
            </Text>
          </View>

          {status !== 'departed' && status !== 'arrived' && status !== 'cancelled' && (
            <Text variant="caption" color="textTertiary">
              Departs in {toDeparture.label}
            </Text>
          )}
        </View>

        {/* ── Ticket ── */}
        <View style={s.ticket}>
          <View style={[s.ticketTop, { backgroundColor: seg.carrierColor }]}>
            <View style={s.carrierMark}>
              <Text variant="caption" style={{ color: seg.carrierColor, fontWeight: '700' }}>
                {seg.marketingCode}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: palette.white }}>
                {seg.marketingCarrier}
              </Text>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {seg.marketingFlight} · {seg.cabin}
                {seg.operatingCarrier ? ` · operated by ${seg.operatingCarrier}` : ''}
              </Text>
            </View>
          </View>

          <View style={s.ticketBody}>
            <View style={s.route}>
              <View style={{ flex: 1 }}>
                <Text style={s.bigTime}>{timeOf(seg.departISO)}</Text>
                <Text style={s.code}>{seg.origin}</Text>
                <Text variant="caption" color="textTertiary">
                  {seg.originCity} · {seg.originTerminal}
                </Text>
              </View>

              <View style={s.middle}>
                <View style={s.dot} />
                <View style={s.line} />
                <Plane size={15} color={palette.gray500} />
                <View style={s.line} />
                <View style={s.dot} />
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={s.arriveRow}>
                  <Text style={s.bigTime}>{timeOf(last.arriveISO)}</Text>
                  {overnight > 0 && <Text style={s.plusDay}>+{overnight}</Text>}
                </View>
                <Text style={s.code}>{last.destination}</Text>
                <Text variant="caption" color="textTertiary">
                  {last.destinationCity} · {last.destinationTerminal}
                </Text>
              </View>
            </View>

            <View style={s.ticketMeta}>
              <Text variant="caption" color="textSecondary">
                {longDateOf(seg.departISO)}
              </Text>
              <Text variant="caption" color="textTertiary">
                {durationLabel(seg.durationMin)} ·{' '}
                {trip.segments.length === 1
                  ? 'Direct'
                  : `${trip.segments.length - 1} stop`}
              </Text>
            </View>
          </View>

          {/* Segment detail */}
          <Pressable
            style={s.segToggle}
            onPress={() => {
              animate();
              setExpandedSeg((v) => (v === 0 ? null : 0));
            }}
          >
            <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
              {expandedSeg === 0 ? 'Hide flight detail' : 'Flight detail'}
            </Text>
            <Feather
              name={expandedSeg === 0 ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={palette.primary600}
            />
          </Pressable>

          {expandedSeg === 0 && (
            <View style={s.segDetail}>
              {trip.segments.map((sg, si) => (
                <View key={`seg-${si}`}>
                  {trip.segments.length > 1 && (
                    <View style={s.legHead}>
                      <View style={[s.legDot, { backgroundColor: sg.carrierColor }]} />
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        {sg.marketingCarrier} · {sg.marketingFlight}
                      </Text>
                      {sg.operatingCarrier && sg.operatingCarrier !== sg.marketingCarrier && (
                        <Text variant="caption" color="textTertiary">
                          · operated by {sg.operatingCarrier}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Timeline */}
                  <View style={s.timeline}>
                    <View style={s.timelineRail}>
                      <View style={s.railDot} />
                      <View style={s.railLine} />
                      <View style={[s.railDot, s.railDotFilled]} />
                    </View>

                    <View style={s.timelineBody}>
                      <View style={s.timelineStop}>
                        <Text style={s.stopTime}>{timeOf(sg.departISO)}</Text>
                        <Text variant="bodySmall" style={{ flex: 1 }}>
                          {sg.originCity} ({sg.origin}) · {sg.originTerminal}
                        </Text>
                      </View>

                      <View style={s.timelineMid}>
                        <Text variant="caption" color="textTertiary">
                          Travel time {durationLabel(sg.durationMin)} · {sg.aircraft}
                        </Text>
                      </View>

                      <View style={s.timelineStop}>
                        <Text style={s.stopTime}>{timeOf(sg.arriveISO)}</Text>
                        <Text variant="bodySmall" style={{ flex: 1 }}>
                          {sg.destinationCity} ({sg.destination}) · {sg.destinationTerminal}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {si < trip.segments.length - 1 && (
                    <View style={s.layoverBanner}>
                      <Feather name="clock" size={13} color={palette.warningDark} />
                      <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
                        Connection in {sg.destinationCity}
                        {trip.segments[si + 1].originTerminal !== sg.destinationTerminal
                          ? ` · terminal ${sg.destinationTerminal} → ${trip.segments[si + 1].originTerminal}`
                          : ` · ${sg.destinationTerminal}`}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              <View style={s.segDivider} />

              <View style={s.factGrid}>
                <Fact label="Fare" value={trip.fareName} />
                <Fact label="Gate" value={trip.segments[0].gate ?? 'TBA'} />
                <Fact label="Booked" value={dateOf(trip.bookedOn)} />
                <Fact label="PNR" value={trip.pnr} />
              </View>
            </View>
          )}
        </View>

        {/* ── Primary action ── */}
        <Pressable
          style={[s.primary, !primary.enabled && s.primaryOff]}
          onPress={primary.onPress}
          disabled={!primary.enabled}
        >
          <Feather
            name={primary.icon}
            size={19}
            color={primary.enabled ? palette.white : palette.gray600}
          />
          <View style={{ flex: 1 }}>
            <Text
              variant="bodyMedium"
              style={{
                color: primary.enabled ? palette.white : palette.gray700,
                fontWeight: '600',
              }}
            >
              {primary.label}
            </Text>
            <Text
              variant="caption"
              style={{
                color: primary.enabled ? 'rgba(255,255,255,0.8)' : palette.gray500,
              }}
            >
              {primary.sub}
            </Text>
          </View>
          {primary.enabled && (
            <Feather name="arrow-right" size={18} color={palette.white} />
          )}
        </Pressable>

        {status === 'cancelled' && trip.refund && (
          <View style={s.refundCard}>
            <View style={s.refundHead}>
              <View>
                <Text variant="caption" color="textTertiary">
                  Refund
                </Text>
                <Text style={s.refundAmount}>
                  ₹{trip.refund.amount.toLocaleString()}
                </Text>
              </View>
              <View style={s.refundTo}>
                <Feather name="credit-card" size={13} color={palette.gray600} />
                <Text variant="caption" color="textSecondary">
                  {trip.refund.method}
                </Text>
              </View>
            </View>

            <View style={s.refundTimeline}>
              {refundStages(trip, now).map((stage, i, arr) => (
                <View key={stage.key} style={s.stage}>
                  <View style={s.stageRail}>
                    <View
                      style={[
                        s.stageDot,
                        stage.state === 'done' && s.stageDotDone,
                        stage.state === 'active' && s.stageDotActive,
                      ]}
                    >
                      {stage.state === 'done' && (
                        <Feather name="check" size={11} color={palette.white} />
                      )}
                      {stage.state === 'active' && <View style={s.stagePulse} />}
                    </View>
                    {i < arr.length - 1 && (
                      <View
                        style={[
                          s.stageLine,
                          stage.state === 'done' && s.stageLineDone,
                        ]}
                      />
                    )}
                  </View>

                  <View style={s.stageBody}>
                    <View style={s.stageTitleRow}>
                      <Text
                        variant="bodySmall"
                        style={{
                          fontWeight: '600',
                          color:
                            stage.state === 'upcoming'
                              ? palette.gray400
                              : palette.gray900,
                        }}
                      >
                        {stage.title}
                      </Text>
                      {stage.at && (
                        <Text variant="caption" color="textTertiary">
                          {dateOf(stage.at)}
                        </Text>
                      )}
                    </View>
                    <Text
                      variant="caption"
                      style={{
                        color:
                          stage.state === 'active'
                            ? palette.primary600
                            : palette.gray500,
                      }}
                    >
                      {stage.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {reissue && (
          <Pressable
            style={s.alert}
            onPress={() => {
              animate();
              setReissue(false);
              setPassOpen(true);
            }}
          >
            <Feather name="refresh-cw" size={15} color={palette.warningDark} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ color: palette.warningDark, fontWeight: '600' }}>
                Boarding pass reissued
              </Text>
              <Text variant="caption" style={{ color: palette.warningDark }}>
                A seat changed after check-in. The earlier pass is no longer valid.
              </Text>
            </View>
          </Pressable>
        )}

        {partiallyCheckedIn(trip) && (
          <Pressable style={s.alert} onPress={() => setCheckInOpen(true)}>
            <Feather name="user-check" size={15} color={palette.warningDark} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ color: palette.warningDark, fontWeight: '600' }}>
                Not everyone is checked in
              </Text>
              <Text variant="caption" style={{ color: palette.warningDark }}>
                Tap to check in the remaining travellers.
              </Text>
            </View>
          </Pressable>
        )}

        {/* ── Quick actions ── */}
        {status !== 'cancelled' && (
          <View style={s.quickRow}>
            <Quick
              icon="download"
              label="E-ticket"
              onPress={() => flash('E-ticket saved to your device')}
            />
            <Quick
              icon="smartphone"
              label="Wallet"
              onPress={() => flash('Added to your wallet')}
            />
            <Quick
              icon="share-2"
              label="Share"
              onPress={() => flash('Itinerary link copied')}
            />
            <Quick
              icon="calendar"
              label="Calendar"
              onPress={() => flash('Added to your calendar')}
            />
          </View>
        )}

        {/* ── Travellers ── */}
        <Section
          title={`TRAVELLERS (${trip.passengers.length})`}
          note={
            status === 'cancelled'
              ? 'Booking cancelled'
              : outstandingCount(trip, now) > 0
                ? `${outstandingCount(trip, now)} of ${trip.passengers.length} need attention`
                : 'Everyone is ready'
          }
        />
        <View style={s.card}>
          {trip.passengers.map((p, i) => (
            <TravellerRow
              key={p.id}
              trip={trip}
              passenger={p}
              now={now}
              cart={cart}
              open={openTraveller === p.id}
              last={i === trip.passengers.length - 1}
              onToggle={() => {
                animate();
                setOpenTraveller((v) => (v === p.id ? null : p.id));
              }}
              onBoardingPass={() => setPassOpen(true)}
              onAddExtras={() => setExtrasFor(p)}
            />
          ))}
        </View>

        {/* ── Ancillaries ── */}
        {/*
          Only offer what can still be added: available and not yet purchased,
          plus anything sitting in the basket (so it stays editable). Bought
          items live in "Extras added" below, and cut-off items that were never
          wanted are just noise once nothing else is addable.
        */}
        {status !== 'cancelled' && (() => {
          const offer = ancillaries.filter((a) => {
            const bought = trip.services.some((sv) => sv.ancillaryId === a.id);
            const pending = cart.some((c) => c.ancillaryId === a.id);
            if (bought) return false;
            if (pending) return true;
            return ancillaryAvailable(a, seg.departISO, now);
          });

          if (offer.length === 0) return null;

          return (
            <>
              <Section title="ADD TO YOUR TRIP" note="Cheaper now than at the airport" />
              <View style={s.card}>
                {offer.map((a, i) => {
                  const pending = cart.find((c) => c.ancillaryId === a.id);

                  return (
                    <Pressable
                      key={a.id}
                      style={[s.addRow, i === offer.length - 1 && s.lastRow]}
                      onPress={() => setAncillary(a)}
                    >
                      <View style={s.addIcon}>
                        <Feather name={a.icon as never} size={17} color={palette.gray600} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{a.name}</Text>
                        <Text variant="caption" color="textTertiary" numberOfLines={1}>
                          {pending
                            ? `In basket · ₹${pending.subtotal.toLocaleString()} · tap to edit`
                            : a.blurb}
                        </Text>
                      </View>

                      {pending ? (
                        <View style={s.pendingTag}>
                          <Feather name="shopping-bag" size={13} color={palette.primary600} />
                        </View>
                      ) : (
                        <View style={s.priceTag}>
                          <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                            +₹{a.price.toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          );
        })()}

        {/* ── Purchased extras ── */}
        {trip.services.length > 0 && (
          <>
            <Section title={`EXTRAS ADDED (${trip.services.length})`} />
            <View style={s.card}>
              {trip.services.map((sv, i) => (
                <View
                  key={sv.id}
                  style={[s.paxRow, i === trip.services.length - 1 && s.lastRow]}
                >
                  <View style={[s.paxMark, { backgroundColor: palette.successLight }]}>
                    <Feather name="check" size={14} color={palette.successDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{sv.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      {sv.passengerIds.length} traveller
                      {sv.passengerIds.length > 1 ? 's' : ''} ·{' '}
                      {dateOf(sv.purchasedAt)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" color="textSecondary">
                    ₹{sv.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Before you fly ── */}
        <Section title="BEFORE YOU FLY" />
        <View style={s.card}>
          {reminders.map((r, i) => (
            <View
              key={r.title}
              style={[s.remindRow, i === reminders.length - 1 && s.lastRow]}
            >
              <Feather name={r.icon as never} size={16} color={palette.gray600} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {r.title}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {r.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Payment ── */}
        <Section title="PAYMENTS" />
        <View style={s.card}>
          {trip.payments.map((pay) => {
            const open = openPayment === pay.id;
            return (
              <View key={pay.id}>
                <Pressable
                  style={s.payRow}
                  onPress={() => {
                    animate();
                    setOpenPayment(open ? null : pay.id);
                  }}
                >
                  <View style={s.payMark}>
                    <Feather
                      name={pay.status === 'paid' ? 'check' : 'x'}
                      size={14}
                      color={
                        pay.status === 'paid' ? palette.successDark : palette.errorDark
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall">{pay.label}</Text>
                    <Text variant="caption" color="textTertiary">
                      {pay.method} · {dateOf(pay.at)} · {pay.lines.length} charges
                    </Text>
                  </View>
                  <Text variant="bodySmall">₹{pay.amount.toLocaleString()}</Text>
                  <Feather
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={palette.gray400}
                  />
                </Pressable>

                {open && (
                  <View style={s.payLines}>
                    {pay.lines.map((ln) => (
                      <View key={ln.label} style={s.payLine}>
                        <View style={{ flex: 1 }}>
                          <Text variant="caption">{ln.label}</Text>
                          {ln.note && (
                            <Text variant="caption" color="textTertiary">
                              {ln.note}
                            </Text>
                          )}
                        </View>
                        <Text variant="caption">₹{ln.amount.toLocaleString()}</Text>
                      </View>
                    ))}
                    <View style={s.payLineRule} />
                    <View style={s.payLine}>
                      <Text variant="bodySmall" style={{ flex: 1, fontWeight: '600' }}>
                        Charged
                      </Text>
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        ₹{pay.amount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          <View style={[s.payRow, s.lastRow, s.payTotal]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Total paid</Text>
              <Text variant="caption" color="textTertiary">
                {trip.passengers.length} traveller
                {trip.passengers.length > 1 ? 's' : ''} · {trip.fareName}
              </Text>
            </View>
            <Text style={s.paid}>
              {trip.currency}
              {trip.totalPaid.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ── Manage ── */}
        {status !== 'cancelled' && (
          <>
            <Section title="MANAGE BOOKING" />
            <View style={s.card}>
              {status !== 'departed' && status !== 'arrived' && (
                <Manage
                  icon="calendar"
                  label="Change travel date"
                  note="Fare difference and change fee may apply"
                  onPress={() => setDateOpen(true)}
                />
              )}
              <Manage
                icon="user-plus"
                label="Update traveller details"
                note="Name corrections must match photo ID"
                onPress={() => setUpdateOpen(true)}
              />
              {trip.passengers.some((p) => p.checkedIn) && (
                <Manage
                  icon="rotate-ccw"
                  label="Cancel check-in"
                  note={canUndoCheckIn(trip, now).reason}
                  onPress={() => setUndoOpen(true)}
                />
              )}
              <Manage
                icon="x-circle"
                label="Cancel booking"
                note={`Refund per fare rules · ${trip.fareName}`}
                danger
                onPress={() => setCancelOpen(true)}
                last
              />
            </View>
          </>
        )}

        <View style={s.contact}>
          <Text variant="caption" color="textTertiary">
            Confirmation sent to {trip.contactEmail}
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Basket ── */}
      {cart.length > 0 && status !== 'cancelled' && (
        <View style={s.basket}>
          {cartOpen && (
            <View style={s.basketLines}>
              {cart.map((c) => (
                <View key={c.ancillaryId} style={s.basketLine}>
                  <Pressable
                    onPress={() => removeFromCart(c.ancillaryId)}
                    hitSlop={8}
                    style={s.dropBtn}
                  >
                    <Feather name="x" size={13} color={palette.gray500} />
                  </Pressable>
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
              <View style={s.basketLine}>
                <Text variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                  Taxes and fees
                </Text>
                <Text variant="bodySmall">₹{cartTax(cart).toLocaleString()}</Text>
              </View>
            </View>
          )}

          <View style={s.basketBar}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                animate();
                setCartOpen((v) => !v);
              }}
            >
              <View style={s.basketTotalRow}>
                <Text variant="caption" color="textTertiary">
                  {cart.length} extra{cart.length > 1 ? 's' : ''} to pay for
                </Text>
                <Feather
                  name={cartOpen ? 'chevron-down' : 'chevron-up'}
                  size={13}
                  color={palette.gray500}
                />
              </View>
              <Text style={s.basketTotal}>
                ₹{cartTotal(cart).toLocaleString()}
              </Text>
            </Pressable>

            <Pressable style={s.basketCta} onPress={() => setPayOpen(true)}>
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Pay now
              </Text>
              <Feather name="arrow-right" size={17} color={palette.white} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Sheets */}
      <CheckInSheet
        visible={checkInOpen}
        trip={trip}
        onClose={() => setCheckInOpen(false)}
        onComplete={completeCheckIn}
        onViewPasses={() => {
          setCheckInOpen(false);
          setPassOpen(true);
        }}
      />

      <BoardingPassSheet
        visible={passOpen && anyCheckedIn && status !== 'cancelled'}
        trip={trip}
        onClose={() => setPassOpen(false)}
      />

      <AncillarySheet
        visible={ancillary !== null}
        item={ancillary}
        trip={trip}
        now={now}
        existing={
          ancillary
            ? (cart.find((c) => c.ancillaryId === ancillary.id) ?? null)
            : null
        }
        onClose={() => setAncillary(null)}
        onAdd={addToCart}
        onRemove={removeFromCart}
      />

      <DateChangeSheet
        visible={dateOpen}
        trip={trip}
        now={now}
        onClose={() => setDateOpen(false)}
        onConfirm={changeDate}
      />

      <TravellerUpdateSheet
        visible={updateOpen}
        trip={trip}
        onClose={() => setUpdateOpen(false)}
        onRename={renameTraveller}
      />

      <CancelBookingSheet
        visible={cancelOpen}
        trip={trip}
        now={now}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancelBooking}
      />

      <TravellerExtrasSheet
        visible={extrasFor !== null}
        passenger={extrasFor}
        trip={trip}
        cart={cart}
        now={now}
        onClose={() => setExtrasFor(null)}
        onAdd={addManyToCart}
      />

      <PaymentSheet
        visible={payOpen}
        cart={cart}
        trip={trip}
        now={now}
        onClose={() => setPayOpen(false)}
        onPaid={settle}
        onDropExpired={(ids) => {
          animate();
          setCart((c) => c.filter((x) => !ids.includes(x.ancillaryId)));
        }}
      />

      <UndoCheckInSheet
        visible={undoOpen}
        trip={trip}
        now={now}
        onClose={() => setUndoOpen(false)}
        onUndo={undoCheckIn}
      />
    </SafeAreaView>
  );
}

// ─── Pieces ──────────────────────────────────────────────


const READY_TONE: Record<
  ReadinessLevel,
  { bg: string; fg: string; icon: string }
> = {
  ready: { bg: palette.successLight, fg: palette.successDark, icon: 'check' },
  action: { bg: palette.warningLight, fg: palette.warningDark, icon: 'alert-circle' },
  waiting: { bg: palette.gray100, fg: palette.gray600, icon: 'clock' },
};

function TravellerRow({
  trip,
  passenger,
  now,
  cart,
  open,
  last,
  onToggle,
  onBoardingPass,
  onAddExtras,
}: {
  trip: Trip;
  passenger: TripPassenger;
  now: number;
  cart: CartItem[];
  open: boolean;
  last: boolean;
  onToggle: () => void;
  onBoardingPass: () => void;
  onAddExtras: () => void;
}) {
  const seg = trip.segments[0];
  const ready = travellerReadiness(trip, passenger, now);
  const tone = READY_TONE[ready.level];
  const position = seatPosition(passenger.seat, seg.aircraft);
  const canAddMore = hasExtrasToAdd(trip, passenger.id, cart, now);
  const bought = servicesFor(trip, passenger.id);
  const pending = cartItemsFor(cart, passenger.id);
  const doc = trip.documents.find((d) => d.passengerId === passenger.id);
  const intl = documentsRequired(trip);

  return (
    <View style={[!last && tr.divider]}>
      <Pressable style={tr.head} onPress={onToggle}>
        <View style={[tr.mark, { backgroundColor: tone.bg }]}>
          {passenger.checkedIn ? (
            <Feather name="check" size={15} color={tone.fg} />
          ) : (
            <Text variant="bodySmall" style={{ color: tone.fg, fontWeight: '700' }}>
              {passenger.name.charAt(0)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {passenger.name}
          </Text>
          <View style={tr.statusRow}>
            <Feather name={tone.icon as never} size={11} color={tone.fg} />
            <Text variant="caption" style={{ color: tone.fg, fontWeight: '600' }}>
              {ready.label}
            </Text>
            <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ flex: 1 }}>
              · {ready.detail}
            </Text>
          </View>
        </View>

        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.gray400}
        />
      </Pressable>

      {open && (
        <View style={tr.body}>
          {/* Seat and sequence */}
          <View style={tr.tiles}>
            <View style={tr.tile}>
              <Text variant="caption" color="textTertiary">
                Seat
              </Text>
              <Text style={tr.tileValue}>{passenger.seat ?? '—'}</Text>
              <Text variant="caption" color="textTertiary">
                {position ?? 'Assigned at the gate'}
              </Text>
            </View>

            <View style={tr.tileRule} />

            <View style={tr.tile}>
              <Text variant="caption" color="textTertiary">
                {passenger.checkedIn ? 'Sequence' : 'Traveller'}
              </Text>
              <Text style={tr.tileValue}>
                {passenger.checkedIn
                  ? passenger.boardingSequence
                  : passenger.type === 'adult'
                    ? 'Adult'
                    : passenger.type === 'child'
                      ? 'Child'
                      : 'Infant'}
              </Text>
              <Text variant="caption" color="textTertiary">
                {passenger.checkedIn ? 'Boarding order' : 'Fare type'}
              </Text>
            </View>
          </View>

          {/* Inclusions */}
          <Line icon="briefcase" label="Baggage" value={passenger.baggage} />
          <Line
            icon="coffee"
            label="Meal"
            value={passenger.meal ?? 'None selected'}
          />
          {intl && (
            <Line
              icon="credit-card"
              label="Passport"
              value={
                doc
                  ? `${doc.passportNumber} · expires ${doc.expiry}`
                  : 'Not provided yet'
              }
              warn={!doc}
            />
          )}

          {/* Extras attached to this person */}
          {(bought.length > 0 || pending.length > 0) && (
            <>
              <Text variant="caption" color="textTertiary" style={tr.sub}>
                EXTRAS FOR {passenger.name.split(' ')[0].toUpperCase()}
              </Text>

              {bought.map((sv) => (
                <View key={sv.id} style={tr.extra}>
                  <Feather name="check-circle" size={13} color={palette.success} />
                  <Text variant="caption" style={{ flex: 1 }}>
                    {sv.name}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    ₹{Math.round(sv.amount / sv.passengerIds.length).toLocaleString()}
                  </Text>
                </View>
              ))}

              {pending.map((c) => (
                <View key={c.ancillaryId} style={tr.extra}>
                  <Feather name="shopping-bag" size={13} color={palette.primary600} />
                  <Text variant="caption" style={{ flex: 1 }}>
                    {c.name}
                  </Text>
                  <Text variant="caption" style={{ color: palette.primary600 }}>
                    ₹{c.unitPrice.toLocaleString()} · unpaid
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Actions */}
          {passenger.type !== 'infant' && (
            <View style={tr.actions}>
              {passenger.checkedIn && (
                <Pressable style={tr.action} onPress={onBoardingPass}>
                  <Feather name="credit-card" size={15} color={palette.gray900} />
                  <Text variant="caption">Boarding pass</Text>
                </Pressable>
              )}
              {canAddMore && (
                <Pressable style={tr.action} onPress={onAddExtras}>
                  <Feather name="plus" size={15} color={palette.gray900} />
                  <Text variant="caption">Add extras</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function Line({
  icon,
  label,
  value,
  warn,
}: {
  icon: string;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <View style={tr.line}>
      <Feather
        name={icon as never}
        size={14}
        color={warn ? palette.warningDark : palette.gray500}
      />
      <Text variant="caption" color="textSecondary" style={{ width: 74 }}>
        {label}
      </Text>
      <Text
        variant="caption"
        style={{ flex: 1, color: warn ? palette.warningDark : palette.gray900 }}
      >
        {value}
      </Text>
    </View>
  );
}

const tr = StyleSheet.create({
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 72,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },

  body: {
    backgroundColor: palette.gray50,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  tiles: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  tile: { flex: 1, alignItems: 'center', gap: 1 },
  tileRule: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: palette.gray200 },
  tileValue: { fontSize: 20, fontWeight: '700', color: palette.gray900, lineHeight: 25 },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },

  sub: { letterSpacing: 1, marginTop: spacing.md, marginBottom: 6 },
  extra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
  },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
  },
});

function Section({ title, note }: { title: string; note?: string }) {
  return (
    <View style={s.section}>
      <Text variant="label" color="textTertiary" style={{ letterSpacing: 1 }}>
        {title}
      </Text>
      {note && (
        <Text variant="caption" color="textTertiary">
          {note}
        </Text>
      )}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fact}>
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
      <Text variant="bodySmall" style={{ fontWeight: '600', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function Quick({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.quick} onPress={onPress}>
      <View style={s.quickIcon}>
        <Feather name={icon as never} size={18} color={palette.gray900} />
      </View>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Pressable>
  );
}

function Manage({
  icon,
  label,
  note,
  onPress,
  danger,
  last,
}: {
  icon: string;
  label: string;
  note: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={[s.manageRow, last && s.lastRow]} onPress={onPress}>
      <Feather
        name={icon as never}
        size={17}
        color={danger ? palette.error : palette.gray600}
      />
      <View style={{ flex: 1 }}>
        <Text
          variant="bodyMedium"
          style={danger ? { color: palette.error } : undefined}
        >
          {label}
        </Text>
        <Text variant="caption" color="textTertiary">
          {note}
        </Text>
      </View>
      <Feather name="chevron-right" size={17} color={palette.gray400} />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
    backgroundColor: palette.gray50,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    marginHorizontal: HPAD,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },

  scroll: { paddingHorizontal: HPAD, paddingTop: spacing.sm },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  // Ticket
  ticket: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    overflow: 'hidden',
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  carrierMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: { padding: spacing.md },
  route: { flexDirection: 'row', alignItems: 'flex-start' },
  bigTime: { fontSize: 24, fontWeight: '700', color: palette.gray900, lineHeight: 29 },
  arriveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  plusDay: { fontSize: 12, fontWeight: '700', color: palette.warning, lineHeight: 16 },
  code: { fontSize: 15, fontWeight: '600', color: palette.gray700, marginTop: 2 },
  middle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    marginTop: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.gray300 },
  line: {
    width: 20,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  segToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 48,
    backgroundColor: palette.gray50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  segDetail: {
    backgroundColor: palette.gray50,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  legHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  legDot: { width: 8, height: 8, borderRadius: 4 },

  timeline: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  timelineRail: { alignItems: 'center', paddingTop: 4 },
  railDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.gray400,
    backgroundColor: palette.gray50,
  },
  railDotFilled: { backgroundColor: palette.gray400 },
  railLine: {
    width: 0,
    flex: 1,
    minHeight: 44,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
    marginVertical: 3,
  },
  timelineBody: { flex: 1, justifyContent: 'space-between' },
  timelineStop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  stopTime: { fontSize: 16, fontWeight: '700', color: palette.gray900, width: 52 },
  timelineMid: { paddingLeft: 52 + spacing.md, paddingVertical: spacing.sm },

  factGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fact: { width: '50%', paddingVertical: spacing.sm },
  segDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray300,
    marginVertical: spacing.sm,
  },
  layoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.warningLight,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: spacing.sm,
  },

  // Primary
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.primary500,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    minHeight: 72,
    ...shadows.card,
  },
  primaryOff: { backgroundColor: palette.gray100 },

  refundCard: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  refundHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  refundAmount: { fontSize: 24, fontWeight: '700', color: palette.gray900, lineHeight: 29 },
  refundTo: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  refundTimeline: { gap: 0 },
  stage: { flexDirection: 'row', gap: spacing.md },
  stageRail: { alignItems: 'center', width: 24 },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotDone: { backgroundColor: palette.success, borderColor: palette.success },
  stageDotActive: { borderColor: palette.primary500 },
  stagePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary500,
  },
  stageLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: palette.gray200,
    marginVertical: 2,
  },
  stageLineDone: { backgroundColor: palette.success },
  stageBody: { flex: 1, paddingBottom: spacing.lg },
  stageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },

  // Quick
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quick: { flex: 1, alignItems: 'center', gap: 6, minHeight: 68, paddingTop: 4 },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    overflow: 'hidden',
  },
  lastRow: { borderBottomWidth: 0 },

  paxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.warningLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  payMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTotal: { backgroundColor: palette.gray50 },
  payLines: {
    backgroundColor: palette.gray50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  payLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 5 },
  payLineRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray300,
    marginVertical: spacing.sm,
  },
  paxMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  addIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  pendingTag: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basket: {
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    ...shadows.floating,
  },
  basketLines: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    backgroundColor: palette.gray50,
  },
  basketLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
  },
  dropBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  basketTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  basketTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 27,
  },
  basketCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    justifyContent: 'center',
  },

  remindRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  paid: { fontSize: 20, fontWeight: '700', color: palette.gray900 },

  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },

  contact: { alignItems: 'center', marginTop: spacing.lg },
});
