import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../components/ui';
import { PageEnter } from '../components/TabScreenEnter';
import { FlightCard } from '../components/FlightCard';
import { PaxSheet } from '../components/PaxSheet';
import { PaxFlatButton } from '../components/PaxFlatButton';
import { PickConfirmSheet } from '../components/PickConfirmSheet';
import {
  FilterSheet,
  emptyFlightFilters,
  applyFlightFilters,
  countActive,
  type FlightFilters,
} from '../components/FilterSheet';
import { layout, palette, spacing, radii, shadows } from '../constants/tokens';
import {
  parseSearchLegs,
  optionsForLeg,
  detectTripMode,
  tripTitle,
  formatLegDate,
  formatLegDateShort,
  sectorLabel,
  type SearchLeg,
  type MultiTripMode,
} from '../data/multiCity';
import type { MockFlight } from '../data/flights';
import { getPicks, type PickKind } from '../lib/flightAnalysis';
import {
  defaultPax,
  availability,
  partyTotal,
  bestFareFor,
  shortPax,
  describePax,
  type PaxMix,
} from '../lib/flightRules';

const HPAD = layout.screenPadding;
const COLLAPSE_Y = 48;

type SelectionMap = Record<string, MockFlight>;

/**
 * Dedicated multi-city / round-trip recommendations.
 * One sector at a time — trip ribbon + focused list, no one-way chrome clutter.
 */
export default function FlightsMulti() {
  const router = useRouter();
  const { legs: legsParam } = useLocalSearchParams<{ legs?: string }>();

  const legs = useMemo(() => parseSearchLegs(legsParam), [legsParam]);
  const mode: MultiTripMode = useMemo(() => detectTripMode(legs), [legs]);

  const [pax, setPax] = useState<PaxMix>(defaultPax);
  const [paxOpen, setPaxOpen] = useState(false);
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [pick, setPick] = useState<{ kind: PickKind; flight: MockFlight } | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const collapseAnim = useRef(new Animated.Value(0)).current;
  const collapsedRef = useRef(false);

  // Reset when itinerary params change
  useEffect(() => {
    setActiveIndex(0);
    setSelections({});
    setReview(false);
    setExpandedId(null);
    setPick(null);
    setFilters(emptyFlightFilters());
    setHeaderCollapsed(false);
    collapsedRef.current = false;
    collapseAnim.setValue(0);
  }, [legsParam, collapseAnim]);

  const activeLeg: SearchLeg | null = legs[activeIndex] ?? null;
  const selectedCount = legs.filter((l) => selections[l.id]).length;
  const allSelected = legs.length > 0 && selectedCount === legs.length;

  const options = useMemo(() => {
    if (!activeLeg) return [];
    const raw = optionsForLeg(activeLeg, activeIndex);
    return applyFlightFilters(raw, filters).filter(
      (f) => availability(f, pax).state !== 'insufficient',
    );
  }, [activeLeg, activeIndex, filters, pax]);

  const picks = useMemo(() => getPicks(options), [options]);

  const runningTotal = useMemo(() => {
    return legs.reduce((sum, leg) => {
      const flight = selections[leg.id];
      if (!flight) return sum;
      const best = bestFareFor(flight, pax);
      return sum + (best ? best.quote.total : partyTotal(flight, pax));
    }, 0);
  }, [legs, selections, pax]);

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapsedRef.current === next) return;
      collapsedRef.current = next;
      setHeaderCollapsed(next);
      Animated.timing(collapseAnim, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [collapseAnim],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (review) return;
      const y = e.nativeEvent.contentOffset.y;
      setCollapsed(y > COLLAPSE_Y);
    },
    [review, setCollapsed],
  );

  const goSector = useCallback(
    (index: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveIndex(index);
      setExpandedId(null);
      setReview(false);
      setPick(null);
      setCollapsed(false);
    },
    [setCollapsed],
  );

  const selectFlight = useCallback(
    (flight: MockFlight) => {
      if (!activeLeg) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelections((prev) => ({ ...prev, [activeLeg.id]: flight }));
      setExpandedId(null);
      setPick(null);

      if (activeIndex < legs.length - 1) {
        setActiveIndex(activeIndex + 1);
        setFilters(emptyFlightFilters());
        setCollapsed(false);
      } else {
        setReview(true);
      }
    },
    [activeLeg, activeIndex, legs.length, setCollapsed],
  );

  const openReview = () => {
    if (!allSelected) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReview(true);
  };

  const onBack = () => {
    if (review) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setReview(false);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/multi-city');
  };

  const detailOpacity = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const detailMaxH = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [220, 0],
  });

  if (legs.length < 2) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <PageEnter variant="multiFlights" backgroundColor={palette.gray50}>
          <View style={s.emptyWrap}>
            <Feather name="git-branch" size={28} color={palette.gray400} />
            <Text variant="h2" align="center">
              Build your trip first
            </Text>
            <Text variant="bodySmall" color="textSecondary" align="center">
              Add at least two flights in multi-city, then search again.
            </Text>
            <Pressable
              style={s.primaryBtn}
              onPress={() => router.replace('/multi-city')}
            >
              <Text variant="bodyMedium" style={s.primaryBtnText}>
                Open multi-city
              </Text>
            </Pressable>
          </View>
        </PageEnter>
      </SafeAreaView>
    );
  }

  const compactLabel =
    mode === 'roundTrip'
      ? activeIndex === 0
        ? 'Flight 1/2'
        : 'Flight 2/2'
      : `Flight ${activeIndex + 1}/${legs.length}`;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PageEnter variant="multiFlights" backgroundColor={palette.gray50}>
        {/* Trip chip + flat pax (matches one-way flights header pattern) */}
        <View style={s.header}>
          <View style={s.headerPill}>
            <Pressable style={s.backInPill} onPress={onBack} hitSlop={6} accessibilityLabel="Go back">
              <Feather name="chevron-left" size={20} color={palette.gray900} />
            </Pressable>
            <View style={s.headerCopy}>
              {headerCollapsed && !review && activeLeg ? (
                <>
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    {compactLabel}
                  </Text>
                  <Text style={s.tripTitle} numberOfLines={1}>
                    <Text style={s.tripCity}>
                      {activeLeg.fromCity} → {activeLeg.toCity}
                    </Text>
                  </Text>
                </>
              ) : (
                <>
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    {mode === 'roundTrip' ? 'Round trip' : 'Multi-city'}
                  </Text>
                  <Text style={s.tripTitle} numberOfLines={1}>
                    <Text style={s.tripCity}>{tripTitle(mode, legs)}</Text>
                  </Text>
                </>
              )}
            </View>
          </View>

          <PaxFlatButton pax={pax} onPress={() => setPaxOpen(true)} />
        </View>

        {review && allSelected ? (
          <ReviewPanel
            legs={legs}
            mode={mode}
            selections={selections}
            pax={pax}
            total={runningTotal}
            onEdit={(i) => goSector(i)}
            onContinue={() => router.push('/booking')}
          />
        ) : (
          <>
            {/* Collapsible chrome: ribbon + sector detail + progress */}
            <Animated.View
              style={{ maxHeight: detailMaxH, opacity: detailOpacity, overflow: 'hidden' }}
              pointerEvents={headerCollapsed ? 'none' : 'auto'}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.ribbon}
                style={s.ribbonWrap}
              >
                {legs.map((leg, i) => {
                  const chosen = selections[leg.id];
                  const on = i === activeIndex;
                  return (
                    <Pressable
                      key={leg.id}
                      style={[s.ribbonChip, on && s.ribbonChipOn, chosen && s.ribbonChipDone]}
                      onPress={() => goSector(i)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                    >
                      <View style={s.ribbonTop}>
                        {chosen ? (
                          <Feather name="check-circle" size={14} color={palette.success} />
                        ) : (
                          <Text variant="caption" style={s.ribbonIndex}>
                            {i + 1}
                          </Text>
                        )}
                        <Text
                          variant="caption"
                          style={{
                            fontWeight: '700',
                            color: on ? palette.primary700 : palette.gray800,
                          }}
                        >
                          {leg.from}→{leg.to}
                        </Text>
                      </View>
                      <Text variant="caption" color="textTertiary">
                        {formatLegDateShort(leg.date)}
                        {chosen ? ` · ${chosen.departTime}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {activeLeg && (
                <View style={s.focus}>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="textTertiary">
                      {sectorLabel(activeIndex, legs.length, mode)}
                    </Text>
                    <Text variant="h2">
                      {activeLeg.fromCity} → {activeLeg.toCity}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {formatLegDate(activeLeg.date)}
                    </Text>
                  </View>
                  <Pressable
                    style={s.filterBtn}
                    onPress={() => setFilterOpen(true)}
                    accessibilityLabel="Filters"
                  >
                    <Feather name="sliders" size={16} color={palette.gray800} />
                    {countActive(filters) > 0 && (
                      <View style={s.filterDot}>
                        <Text style={s.filterDotText}>{countActive(filters)}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              )}

              <View style={s.progressRow}>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${(selectedCount / legs.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text variant="caption" color="textTertiary">
                  {selectedCount}/{legs.length} chosen
                </Text>
              </View>
            </Animated.View>

            {/* Compact filter access while scrolled */}
            {headerCollapsed && (
              <View style={s.compactBar}>
                <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
                  {selectedCount}/{legs.length} chosen
                </Text>
                <Pressable
                  style={s.filterBtnSm}
                  onPress={() => setFilterOpen(true)}
                  accessibilityLabel="Filters"
                >
                  <Feather name="sliders" size={15} color={palette.gray800} />
                  {countActive(filters) > 0 && <View style={s.filterDotSm} />}
                </Pressable>
              </View>
            )}

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              {picks.length > 0 && (
                <View style={s.picks}>
                  <Text variant="caption" color="textTertiary" style={s.picksLabel}>
                    TOP FOR THIS FLIGHT
                  </Text>
                  {picks.slice(0, 2).map((p) => (
                    <Pressable
                      key={p.kind}
                      style={s.pickChip}
                      onPress={() => setPick({ kind: p.kind, flight: p.flight })}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          variant="caption"
                          style={{ fontWeight: '700', color: palette.primary700 }}
                        >
                          {p.kind === 'bestValue'
                            ? 'Best value'
                            : p.kind === 'cheapest'
                              ? 'Cheapest'
                              : 'Fastest'}
                        </Text>
                        <Text variant="caption" color="textTertiary">
                          {p.flight.airlineCode} · {stopsLabelShort(p.flight)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text variant="caption" style={{ fontWeight: '700', color: palette.gray900 }}>
                          {p.flight.departTime}
                        </Text>
                        <Text variant="caption" color="textSecondary">
                          ₹
                          {(
                            bestFareFor(p.flight, pax)?.quote.total ?? p.flight.price
                          ).toLocaleString()}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={palette.gray400} />
                    </Pressable>
                  ))}
                </View>
              )}

              {options.length === 0 ? (
                <View style={s.emptyList}>
                  <Text variant="bodyMedium" align="center">
                    No flights match these filters
                  </Text>
                  <Pressable onPress={() => setFilters(emptyFlightFilters())}>
                    <Text
                      variant="bodySmall"
                      style={{ color: palette.primary600, fontWeight: '600' }}
                    >
                      Clear filters
                    </Text>
                  </Pressable>
                </View>
              ) : (
                options.map((flight) => {
                  const selected = activeLeg
                    ? selections[activeLeg.id]?.id === flight.id
                    : false;
                  return (
                    <View key={flight.id} style={selected ? s.selectedWrap : undefined}>
                      <FlightCard
                        flight={flight}
                        pax={pax}
                        expanded={expandedId === flight.id}
                        compareMode={false}
                        isChecked={selected}
                        canCheck={false}
                        selectLabel="Select flight"
                        onToggleExpand={() =>
                          setExpandedId((id) => (id === flight.id ? null : flight.id))
                        }
                        onToggleCheck={() => {}}
                        onSelectFare={() => selectFlight(flight)}
                      />
                    </View>
                  );
                })
              )}
              <View style={{ height: 120 }} />
            </ScrollView>

            <View style={s.footer}>
              <View>
                <Text variant="caption" color="textTertiary">
                  Trip total so far
                </Text>
                <Text style={s.total}>
                  {runningTotal > 0 ? `₹${runningTotal.toLocaleString()}` : '—'}
                </Text>
              </View>
              {allSelected ? (
                <Pressable style={s.footerCta} onPress={openReview}>
                  <Text style={s.footerCtaText}>Review trip</Text>
                  <Feather name="arrow-right" size={18} color={palette.white} />
                </Pressable>
              ) : selections[activeLeg?.id ?? ''] ? (
                <Pressable
                  style={s.footerCta}
                  onPress={() => {
                    if (activeIndex < legs.length - 1) goSector(activeIndex + 1);
                    else openReview();
                  }}
                >
                  <Text style={s.footerCtaText}>
                    {activeIndex < legs.length - 1 ? 'Next flight' : 'Review trip'}
                  </Text>
                  <Feather name="arrow-right" size={18} color={palette.white} />
                </Pressable>
              ) : (
                <View style={[s.footerCta, s.footerCtaOff]}>
                  <Text style={s.footerCtaText}>Pick a flight</Text>
                </View>
              )}
            </View>
          </>
        )}
      </PageEnter>

      <PaxSheet
        visible={paxOpen}
        pax={pax}
        onClose={() => setPaxOpen(false)}
        onApply={(next) => {
          setPax(next);
          setPaxOpen(false);
        }}
      />

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        flights={activeLeg ? optionsForLeg(activeLeg, activeIndex) : []}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />

      <PickConfirmSheet
        visible={pick != null}
        kind={pick?.kind ?? null}
        flight={pick?.flight ?? null}
        pax={pax}
        confirmLabel="Select this flight"
        onClose={() => setPick(null)}
        onConfirm={() => {
          if (pick) selectFlight(pick.flight);
        }}
      />
    </SafeAreaView>
  );
}

function stopsLabelShort(flight: MockFlight): string {
  if (flight.stops === 0) return 'Direct';
  if (flight.stops === 1) return '1 stop';
  return `${flight.stops} stops`;
}

function ReviewPanel({
  legs,
  mode,
  selections,
  pax,
  total,
  onEdit,
  onContinue,
}: {
  legs: SearchLeg[];
  mode: MultiTripMode;
  selections: SelectionMap;
  pax: PaxMix;
  total: number;
  onEdit: (index: number) => void;
  onContinue: () => void;
}) {
  return (
    <View style={s.review}>
      <ScrollView contentContainerStyle={s.reviewScroll} showsVerticalScrollIndicator={false}>
        <Text variant="h1">Your trip</Text>
        <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
          {mode === 'roundTrip' ? 'Round trip' : `${legs.length} flights`} · {describePax(pax)}
        </Text>

        {legs.map((leg, i) => {
          const flight = selections[leg.id];
          if (!flight) return null;
          const best = bestFareFor(flight, pax);
          const price = best ? best.quote.total : partyTotal(flight, pax);
          return (
            <View key={leg.id} style={s.reviewCard}>
              <View style={s.reviewCardHead}>
                <Text variant="caption" color="textTertiary">
                  {sectorLabel(i, legs.length, mode)}
                </Text>
                <Pressable onPress={() => onEdit(i)} hitSlop={8}>
                  <Text variant="caption" style={{ color: palette.primary600, fontWeight: '700' }}>
                    Change
                  </Text>
                </Pressable>
              </View>
              <Text variant="h2">
                {leg.from} → {leg.to}
              </Text>
              <Text variant="caption" color="textSecondary">
                {formatLegDate(leg.date)} · {flight.departTime}–{flight.arriveTime}
                {flight.arrivalDayOffset > 0 ? ` +${flight.arrivalDayOffset}` : ''}
              </Text>
              <View style={s.reviewMeta}>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {flight.airline} {flight.flightNumber}
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                  ₹{price.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={s.footer}>
        <View>
          <Text variant="caption" color="textTertiary">
            Total for {shortPax(pax).toLowerCase()}
          </Text>
          <Text style={s.total}>₹{total.toLocaleString()}</Text>
        </View>
        <Pressable style={s.footerCta} onPress={onContinue}>
          <Text style={s.footerCtaText}>Continue</Text>
          <Feather name="arrow-right" size={18} color={palette.white} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingRight: spacing.md,
    paddingLeft: 5,
    paddingVertical: 5,
    minHeight: 52,
    maxWidth: '78%',
    flexShrink: 1,
  },
  backInPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flexShrink: 1,
    justifyContent: 'center',
    paddingRight: 2,
  },
  tripTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  tripCity: {
    fontWeight: '700',
    color: palette.gray900,
  },

  ribbonWrap: { flexGrow: 0 },
  ribbon: {
    paddingHorizontal: HPAD,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  ribbonChip: {
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    gap: 2,
  },
  ribbonChipOn: {
    borderColor: palette.primary300,
    backgroundColor: palette.primary50,
  },
  ribbonChipDone: {
    borderColor: palette.successLight,
  },
  ribbonTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ribbonIndex: {
    width: 16,
    textAlign: 'center',
    fontWeight: '700',
    color: palette.gray500,
  },

  focus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterDotText: { fontSize: 10, fontWeight: '700', color: palette.white },

  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HPAD,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  filterBtnSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDotSm: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.primary500,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary500,
    borderRadius: 2,
  },

  list: {
    paddingHorizontal: HPAD,
    gap: spacing.md,
  },
  picks: { gap: spacing.sm, marginBottom: spacing.xs },
  picksLabel: { letterSpacing: 0.8, fontWeight: '600' },
  pickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.primary100,
  },
  selectedWrap: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: palette.primary300,
  },
  emptyList: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    ...shadows.floating,
  },
  total: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 28,
  },
  footerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: palette.primary500,
  },
  footerCtaOff: { backgroundColor: palette.gray400 },
  footerCtaText: {
    color: palette.white,
    fontWeight: '700',
    fontSize: 15,
  },

  review: { flex: 1 },
  reviewScroll: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  reviewCard: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    gap: 4,
  },
  reviewCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  primaryBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: palette.white, fontWeight: '600' },
});
