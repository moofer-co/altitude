import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../components/ui';
import { palette, spacing, radii, shadows } from '../constants/tokens';
import { mockFlights, dateStrip, type MockFlight } from '../data/flights';
import { FlightCard } from '../components/FlightCard';
import { FareSheet } from '../components/FareSheet';
import { FlightCompareSheet } from '../components/FlightCompareSheet';
import { AssistFab, AssistSheet } from '../components/DecisionAssist';
import { PaxSheet } from '../components/PaxSheet';
import {
  FilterSheet,
  emptyFlightFilters,
  applyFlightFilters,
  countActive,
  type FlightFilters,
} from '../components/FilterSheet';
import { getPicks, type PickKind } from '../lib/flightAnalysis';
import { sortByPriority, PRIORITY_META, type Priority } from '../lib/decisionAssist';
import {
  defaultPax,
  availability,
  partyTotal,
  seatsNeeded,
  shortPax,
  describePax,
  type PaxMix,
} from '../lib/flightRules';

const { width: SW } = Dimensions.get('window');
const HPAD = spacing.lg;

/** Fewer chips on screen; the rest scroll week by week. */
const DATES_VISIBLE = 5;
const DATE_CHIP_W = (SW - HPAD * 2) / DATES_VISIBLE;
const DATE_CHIP_GAP = 0;

const HEADER_H = 64;
const MONTH_H = 28;
const DATE_H = 82;
const FILTER_H = 60;
const CHROME_H = MONTH_H + DATE_H + FILTER_H;

const MAX_COMPARE = 3;
const HESITATION_THRESHOLD = 4;
const HESITATION_DELAY = 28000;

type SortMode = 'price' | 'stops' | 'time';

const PICK_META: Record<
  PickKind,
  { label: string; color: string; bg: string; icon: string }
> = {
  bestValue: { label: 'Best value', color: palette.primary600, bg: palette.primary50, icon: 'zap' },
  cheapest: { label: 'Cheapest', color: palette.warningDark, bg: palette.warningLight, icon: 'tag' },
  fastest: { label: 'Fastest', color: palette.infoDark, bg: palette.infoLight, icon: 'trending-up' },
};

function formatHeaderDate(d: (typeof dateStrip)[number]) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wd = weekdays[new Date(`${d.full}T12:00:00`).getDay()];
  return `${wd}, ${d.date} ${d.month}`;
}

export default function Flights() {
  const router = useRouter();
  const [pax, setPax] = useState<PaxMix>(defaultPax);
  const [dateIndex, setDateIndex] = useState(0);
  const [visibleMonth, setVisibleMonth] = useState(
    `${dateStrip[0].monthFull} ${dateStrip[0].year}`,
  );
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [filters, setFilters] = useState<FlightFilters>(emptyFlightFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [paxOpen, setPaxOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fareFlight, setFareFlight] = useState<MockFlight | null>(null);
  const [confirmed, setConfirmed] = useState<
    { flight: string; fare: string; price: number } | null
  >(null);

  // Decision assist
  const [assistReady, setAssistReady] = useState(false);
  const [assistHint, setAssistHint] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistOptedOut, setAssistOptedOut] = useState(false);
  const [priority, setPriority] = useState<Priority | null>(null);
  const signals = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const monthFade = useRef(new Animated.Value(1)).current;

  const selectedDate = dateStrip[dateIndex] ?? dateStrip[0];
  const lowestPrice = useMemo(
    () => Math.min(...dateStrip.map((d) => d.price)),
    [],
  );

  const setMonthLabel = useCallback(
    (label: string) => {
      setVisibleMonth((prev) => {
        if (prev === label) return prev;
        monthFade.setValue(0.35);
        Animated.timing(monthFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
        return label;
      });
    },
    [monthFade],
  );

  const onDateScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.max(
        0,
        Math.min(dateStrip.length - 1, Math.round(x / DATE_CHIP_W)),
      );
      const d = dateStrip[idx];
      setMonthLabel(`${d.monthFull} ${d.year}`);
    },
    [setMonthLabel],
  );

  const selectDate = useCallback(
    (i: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDateIndex(i);
      const d = dateStrip[i];
      setMonthLabel(`${d.monthFull} ${d.year}`);
      dateScrollRef.current?.scrollTo({
        x: Math.max(0, (i - Math.floor(DATES_VISIBLE / 2)) * DATE_CHIP_W),
        animated: true,
      });
    },
    [setMonthLabel],
  );

  // ── Chrome animation ──
  const collapse = useRef(new Animated.Value(0)).current;
  const chrome = useRef(new Animated.Value(0)).current;
  const pill = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const lastDir = useRef<'up' | 'down'>('up');
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerHeight = chrome.interpolate({
    inputRange: [0, 1],
    outputRange: [HEADER_H, 0],
  });
  const headerOpacity = chrome.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0, 0],
  });
  const chromeHeight = Animated.multiply(
    collapse.interpolate({ inputRange: [0, 1], outputRange: [CHROME_H, 0] }),
    chrome.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
  );
  const chromeShift = collapse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -CHROME_H],
  });
  const compareBarHeight = chrome.interpolate({
    inputRange: [0, 1],
    outputRange: [0, HEADER_H],
  });
  const compareBarOpacity = chrome.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const runCollapse = useCallback(
    (to: number) =>
      Animated.timing(collapse, {
        toValue: to,
        duration: 200,
        useNativeDriver: false,
      }).start(),
    [collapse],
  );
  const runChrome = useCallback(
    (to: number) =>
      Animated.timing(chrome, {
        toValue: to,
        duration: 260,
        useNativeDriver: false,
      }).start(),
    [chrome],
  );
  const runPill = useCallback(
    (to: number) =>
      Animated.spring(pill, {
        toValue: to,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start(),
    [pill],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const y = contentOffset.y;
      const maxScroll = Math.max(0, contentSize.height - layoutMeasurement.height);

      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(() => runPill(0), 380);

      if (maxScroll < CHROME_H + 140) {
        lastY.current = y;
        return;
      }

      // Rubber-band zones flip direction every frame; ignore them
      if (y <= 2 || y >= maxScroll - 4) {
        if (y <= 2 && lastDir.current !== 'up') {
          lastDir.current = 'up';
          runCollapse(0);
        }
        lastY.current = y;
        return;
      }

      const dir =
        y > lastY.current + 4 ? 'down' : y < lastY.current - 4 ? 'up' : lastDir.current;

      if (dir !== lastDir.current) {
        lastDir.current = dir;
        if (dir === 'down' && y > 48) {
          runCollapse(1);
          runPill(120);
        } else if (dir === 'up') {
          runCollapse(0);
        }
      }
      lastY.current = y;
    },
    [runCollapse, runPill],
  );

  // ── Hesitation ──
  const revealAssist = useCallback(() => {
    if (assistOptedOut || priority) return;
    setAssistReady(true);
    setAssistHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setAssistHint(false), 7000);
  }, [assistOptedOut, priority]);

  const noteSignal = useCallback(() => {
    if (assistOptedOut || priority || assistReady) return;
    signals.current += 1;
    if (signals.current >= HESITATION_THRESHOLD) revealAssist();
  }, [assistOptedOut, priority, assistReady, revealAssist]);

  useEffect(() => {
    if (assistOptedOut || priority) return;
    const t = setTimeout(revealAssist, HESITATION_DELAY);
    return () => clearTimeout(t);
  }, [assistOptedOut, priority, revealAssist]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );

  // ── Data ──
  const filtered = useMemo(
    () => applyFlightFilters(mockFlights, filters),
    [filters],
  );

  /** Flights that cannot seat this party sink to the bottom rather than vanish. */
  const { bookable, unbookable } = useMemo(() => {
    const ok: MockFlight[] = [];
    const no: MockFlight[] = [];
    filtered.forEach((f) => {
      if (availability(f, pax).state === 'insufficient') no.push(f);
      else ok.push(f);
    });
    return { bookable: ok, unbookable: no };
  }, [filtered, pax]);

  const ordered = useMemo(() => {
    if (priority) return sortByPriority(bookable, priority);
    const s = [...bookable];
    if (sortMode === 'price')
      s.sort((a, b) => partyTotal(a, pax) - partyTotal(b, pax));
    if (sortMode === 'stops') s.sort((a, b) => a.stops - b.stops || a.price - b.price);
    if (sortMode === 'time') s.sort((a, b) => a.durationMin - b.durationMin);
    return s;
  }, [bookable, sortMode, priority, pax]);

  const picks = useMemo(
    () => (priority ? [] : getPicks(bookable)),
    [bookable, priority],
  );
  const pickIds = useMemo(() => new Set(picks.map((p) => p.flight.id)), [picks]);
  const rest = useMemo(
    () => ordered.filter((f) => !pickIds.has(f.id)),
    [ordered, pickIds],
  );

  const activeFilters = countActive(filters);
  // ── Handlers ──
  const animate = () =>
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const enterCompare = useCallback(() => {
    animate();
    setCompareMode(true);
    setCheckedIds([]);
    setExpandedId(null);
    runChrome(1);
    runCollapse(0);
    noteSignal();
  }, [runChrome, runCollapse, noteSignal]);

  const exitCompare = useCallback(() => {
    animate();
    setCompareMode(false);
    setCheckedIds([]);
    runChrome(0);
  }, [runChrome]);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < MAX_COMPARE
          ? [...ids, id]
          : ids,
    );
  }, []);

  const checkedFlights = useMemo(
    () =>
      checkedIds
        .map((id) => mockFlights.find((f) => f.id === id))
        .filter((f): f is MockFlight => Boolean(f)),
    [checkedIds],
  );

  const renderCard = (flight: MockFlight) => (
    <FlightCard
      key={flight.id}
      flight={flight}
      pax={pax}
      expanded={expandedId === flight.id}
      compareMode={compareMode}
      isChecked={checkedIds.includes(flight.id)}
      canCheck={checkedIds.length < MAX_COMPARE}
      onToggleExpand={() => {
        animate();
        noteSignal();
        setExpandedId((p) => (p === flight.id ? null : flight.id));
      }}
      onToggleCheck={() => toggleCheck(flight.id)}
      onSelectFare={() => setFareFlight(flight)}
    />
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <Animated.View
        style={[s.headerWrap, { height: headerHeight, opacity: headerOpacity }]}
      >
        <View style={s.header}>
          <Pressable
            style={s.iconBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
            }}
            hitSlop={6}
          >
            <Feather name="chevron-left" size={20} color={palette.gray900} />
          </Pressable>

          <View style={s.headerCenter}>
            <View style={s.routeRow}>
              <Text style={s.route}>DEL</Text>
              <Feather name="arrow-right" size={14} color={palette.gray400} />
              <Text style={s.route}>BLR</Text>
            </View>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {formatHeaderDate(selectedDate)} · {shortPax(pax)}
            </Text>
          </View>

          <Pressable style={s.iconBtn} onPress={() => setPaxOpen(true)} hitSlop={6}>
            <Feather name="edit-2" size={16} color={palette.gray900} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Compare bar ── */}
      <Animated.View
        style={[s.compareBar, { height: compareBarHeight, opacity: compareBarOpacity }]}
        pointerEvents={compareMode ? 'auto' : 'none'}
      >
        <View style={s.compareInner}>
          <Pressable style={s.compareClose} onPress={exitCompare} hitSlop={8}>
            <Feather name="x" size={19} color={palette.white} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: palette.white }}>
              Pick flights to compare
            </Text>
            <Text variant="caption" style={{ color: palette.gray400 }}>
              Up to {MAX_COMPARE} · tap a card to add it
            </Text>
          </View>
          <View style={s.compareCount}>
            <Text variant="bodySmall" style={{ color: palette.white, fontWeight: '700' }}>
              {checkedIds.length}/{MAX_COMPARE}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Month + dates + filters ── */}
      <Animated.View style={[s.chromeWrap, { height: chromeHeight }]}>
        <Animated.View style={{ transform: [{ translateY: chromeShift }] }}>
          <Animated.View style={[s.monthRow, { opacity: monthFade }]}>
            <Text style={s.monthLabel}>{visibleMonth}</Text>
            <Text variant="caption" color="textTertiary">
              Scroll for more dates
            </Text>
          </Animated.View>

          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={DATE_CHIP_W + DATE_CHIP_GAP}
            snapToAlignment="start"
            disableIntervalMomentum
            onScroll={onDateScroll}
            scrollEventThrottle={16}
            contentContainerStyle={s.dateStrip}
            style={s.dateScroll}
          >
            {dateStrip.map((d, i) => {
              const on = i === dateIndex;
              const lowest = d.price === lowestPrice;
              return (
                <Pressable
                  key={d.full}
                  style={[s.dateChip, { width: DATE_CHIP_W }, on && s.dateChipOn]}
                  onPress={() => selectDate(i)}
                >
                  <Text
                    variant="caption"
                    align="center"
                    style={{
                      color: on ? 'rgba(255,255,255,0.85)' : palette.gray500,
                      fontWeight: '500',
                    }}
                  >
                    {d.day}
                  </Text>
                  <Text
                    align="center"
                    style={[s.dateNum, { color: on ? palette.white : palette.gray900 }]}
                  >
                    {d.date}
                  </Text>
                  <Text
                    variant="caption"
                    align="center"
                    style={{
                      color: on
                        ? 'rgba(255,255,255,0.9)'
                        : lowest
                          ? palette.success
                          : palette.warning,
                      fontWeight: lowest || on ? '600' : '400',
                    }}
                  >
                    ₹{(d.price / 1000).toFixed(1)}k
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Filters */}
          <View style={s.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterChips}
            >
              <QuickChip
                icon="columns"
                label="Compare"
                active={false}
                onPress={enterCompare}
              />
              <QuickChip
                icon="rotate-ccw"
                label="Refundable"
                active={filters.refundable}
                onPress={() => {
                  animate();
                  noteSignal();
                  setFilters((f) => ({ ...f, refundable: !f.refundable }));
                }}
              />
              <QuickChip
                icon="navigation"
                label="Direct"
                active={filters.maxStops === 0}
                onPress={() => {
                  animate();
                  noteSignal();
                  setFilters((f) => ({
                    ...f,
                    maxStops: f.maxStops === 0 ? null : 0,
                  }));
                }}
              />
            </ScrollView>

            <Pressable
              style={s.filterBtn}
              onPress={() => {
                noteSignal();
                setFilterOpen(true);
              }}
            >
              <Feather name="sliders" size={19} color={palette.gray900} />
              {activeFilters > 0 && (
                <View style={s.filterDot}>
                  <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                    {activeFilters}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Priority banner ── */}
      {priority && !compareMode && (
        <View style={s.priorityBar}>
          <Feather
            name={PRIORITY_META[priority].icon as never}
            size={14}
            color={palette.primary600}
          />
          <Text variant="caption" style={{ flex: 1, color: palette.primary700 }}>
            Ordered for {PRIORITY_META[priority].label.toLowerCase()}
          </Text>
          <Pressable onPress={() => setAssistOpen(true)} hitSlop={8}>
            <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
              Change
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              animate();
              setPriority(null);
              signals.current = 0;
            }}
            hitSlop={8}
          >
            <Feather name="x" size={14} color={palette.primary600} />
          </Pressable>
        </View>
      )}

      {confirmed && !compareMode && (
        <Pressable
          style={s.banner}
          onPress={() => {
            animate();
            setConfirmed(null);
          }}
        >
          <Feather name="check-circle" size={17} color={palette.white} />
          <Text variant="caption" color="textInverse" style={{ flex: 1 }}>
            {confirmed.fare} on {confirmed.flight} · ₹{confirmed.price.toLocaleString()}
          </Text>
        </Pressable>
      )}

      {/* ── Results ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {bookable.length === 0 ? (
          <View style={s.empty}>
            <Feather name="search" size={28} color={palette.gray300} />
            <Text variant="h2" align="center" style={{ marginTop: spacing.md }}>
              {filtered.length === 0 ? 'No flights match' : 'Not enough seats'}
            </Text>
            <Text variant="bodySmall" color="textSecondary" align="center">
              {filtered.length === 0
                ? 'Try removing a filter to see more options.'
                : `No flight has ${seatsNeeded(pax)} seats together. Try fewer travellers or another date.`}
            </Text>
            <Pressable
              style={s.emptyBtn}
              onPress={() => {
                animate();
                if (filtered.length === 0) setFilters(emptyFlightFilters());
                else setPaxOpen(true);
              }}
            >
              <Text variant="bodySmall" style={{ color: palette.white, fontWeight: '600' }}>
                {filtered.length === 0 ? 'Clear filters' : 'Change travellers'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Party summary */}
            {seatsNeeded(pax) > 1 && (
              <View style={s.paxNote}>
                <Feather name="users" size={13} color={palette.gray600} />
                <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  Prices shown are the total for {describePax(pax)}
                </Text>
                <Pressable onPress={() => setPaxOpen(true)} hitSlop={8}>
                  <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                    Change
                  </Text>
                </Pressable>
              </View>
            )}

            {picks.length > 0 && !compareMode && (
              <>
                <Text variant="bodySmall" color="textSecondary" style={s.section}>
                  {activeFilters > 0 ? 'Top picks for your filters' : 'Top picks'}
                </Text>

                {picks.map(({ kind, flight, reason }) => {
                  const meta = PICK_META[kind];
                  return (
                    <View key={flight.id}>
                      <View style={s.pickRow}>
                        <View style={[s.pickBadge, { backgroundColor: meta.bg }]}>
                          <Feather name={meta.icon as never} size={11} color={meta.color} />
                          <Text
                            style={{ fontSize: 12, fontWeight: '700', color: meta.color }}
                          >
                            {meta.label}
                          </Text>
                        </View>
                        <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
                          {reason}
                        </Text>
                      </View>
                      {renderCard(flight)}
                    </View>
                  );
                })}
              </>
            )}

            {rest.length > 0 && (
              <>
                {!compareMode && (
                  <Text variant="bodySmall" color="textSecondary" style={s.section}>
                    {priority
                      ? `All ${rest.length} flights · best match first`
                      : `All other options (${rest.length})`}
                  </Text>
                )}
                {rest.map(renderCard)}
              </>
            )}

            {/* Cannot seat this party */}
            {unbookable.length > 0 && !compareMode && (
              <>
                <View style={s.section}>
                  <Text variant="bodySmall" color="textSecondary">
                    Not enough seats for {seatsNeeded(pax)} ({unbookable.length})
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    Shown so you can see what was excluded
                  </Text>
                </View>
                {unbookable.map(renderCard)}
              </>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Compare tray ── */}
      {compareMode && (
        <View style={s.tray}>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ color: palette.white, fontWeight: '600' }}>
              {checkedIds.length} selected
            </Text>
            <Text variant="caption" style={{ color: palette.gray400 }}>
              {checkedIds.length < 2 ? 'Pick at least two' : 'Ready to compare'}
            </Text>
          </View>
          <Pressable
            style={[s.trayBtn, checkedIds.length < 2 && s.trayBtnOff]}
            disabled={checkedIds.length < 2}
            onPress={() => setCompareOpen(true)}
          >
            <Text variant="bodySmall" style={{ color: palette.white, fontWeight: '600' }}>
              Compare
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Sort ── */}
      {!compareMode && !priority && (
        <Animated.View style={[s.sortBar, { transform: [{ translateY: pill }] }]}>
          {(['price', 'stops', 'time'] as SortMode[]).map((m, i) => {
            const on = sortMode === m;
            return (
              <Pressable
                key={m}
                style={[s.sortTab, i < 2 && s.sortDivider]}
                onPress={() => {
                  animate();
                  noteSignal();
                  setSortMode(m);
                }}
              >
                <Text
                  variant="label"
                  style={{
                    color: on ? palette.white : palette.gray400,
                    fontWeight: on ? '700' : '500',
                    letterSpacing: 1,
                  }}
                >
                  {m.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {/* ── Assist ── */}
      <AssistFab
        visible={assistReady && !compareMode && !assistOpen}
        hint={assistHint}
        onPress={() => {
          setAssistHint(false);
          setAssistOpen(true);
        }}
        onDismissHint={() => {
          setAssistHint(false);
          setAssistReady(false);
          setAssistOptedOut(true);
        }}
      />

      <AssistSheet
        flights={bookable}
        visible={assistOpen}
        onClose={() => setAssistOpen(false)}
        onApply={(p, timing) => {
          animate();
          setPriority(p);
          setAssistOpen(false);
          setAssistReady(false);
          setAssistHint(false);
          if (timing !== 'any') {
            setFilters((f) => ({ ...f, bands: new Set([timing]) }));
          }
        }}
        onSelectFlight={(f) => {
          setAssistOpen(false);
          setFareFlight(f);
        }}
      />

      {/* ── Sheets ── */}
      <PaxSheet
        visible={paxOpen}
        pax={pax}
        onClose={() => setPaxOpen(false)}
        onApply={(next) => {
          animate();
          setPax(next);
          setPaxOpen(false);
        }}
      />

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        flights={mockFlights}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          animate();
          setFilters(next);
          setFilterOpen(false);
        }}
      />

      <FareSheet
        flight={fareFlight}
        visible={fareFlight !== null}
        onClose={() => setFareFlight(null)}
        onConfirm={(fare, price) => {
          setConfirmed({ flight: fareFlight!.flightNumber, fare, price });
          setFareFlight(null);
        }}
      />

      <FlightCompareSheet
        flights={checkedFlights}
        visible={compareOpen}
        onClose={() => setCompareOpen(false)}
        onPick={(flight) => {
          setCompareOpen(false);
          exitCompare();
          setFareFlight(flight);
        }}
      />
    </SafeAreaView>
  );
}

function QuickChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.quickChip, active && s.quickChipOn]} onPress={onPress}>
      <Feather
        name={icon as never}
        size={13}
        color={active ? palette.white : palette.gray600}
      />
      <Text
        variant="bodySmall"
        style={{
          color: active ? palette.white : palette.gray900,
          fontWeight: active ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },

  headerWrap: { overflow: 'hidden', backgroundColor: palette.gray50, zIndex: 20 },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  route: { fontSize: 17, fontWeight: '700', color: palette.gray900, letterSpacing: 0.3 },

  compareBar: { overflow: 'hidden', backgroundColor: palette.gray900, zIndex: 20 },
  compareInner: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
  },
  compareClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareCount: {
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },

  chromeWrap: { overflow: 'hidden', backgroundColor: palette.gray50, zIndex: 10 },
  monthRow: {
    height: MONTH_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HPAD,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.gray600,
    letterSpacing: 0.4,
  },
  dateScroll: { height: DATE_H },
  dateStrip: {
    paddingHorizontal: HPAD,
    alignItems: 'center',
  },
  dateChip: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  dateChipOn: { backgroundColor: palette.primary500 },
  dateNum: { fontSize: 19, fontWeight: '700', lineHeight: 25 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FILTER_H,
    paddingRight: HPAD,
  },
  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  quickChipOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },
  filterBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  filterDot: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  priorityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primary50,
    marginHorizontal: HPAD,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.success,
    marginHorizontal: HPAD,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },

  list: { paddingHorizontal: HPAD, paddingTop: spacing.md },
  paxNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  section: { marginTop: spacing.sm, marginBottom: spacing.sm },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },

  empty: { alignItems: 'center', paddingTop: spacing['3xl'], gap: 4 },
  emptyBtn: {
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radii.full,
    marginTop: spacing.lg,
  },

  tray: {
    position: 'absolute',
    left: HPAD,
    right: HPAD,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.gray900,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.floating,
  },
  trayBtn: {
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radii.full,
  },
  trayBtnOff: { backgroundColor: palette.gray600 },

  sortBar: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: palette.gray900,
    borderRadius: radii.full,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    ...shadows.floating,
  },
  sortTab: { paddingHorizontal: spacing.md },
  sortDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.gray600,
  },
});
