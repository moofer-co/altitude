import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Row } from '../components/ui';
import { palette, spacing, radii } from '../constants/tokens';
import {
  fareData,
  getCheapestDates,
  getPriceRange,
  getDayAbbr,
  getMonthName,
  groupByMonth,
  type DayPrice,
} from '../data/prices';

const { width: SW } = Dimensions.get('window');
const HPAD = spacing.lg;
const CONTENT_W = SW - HPAD * 2;

// ─── Histogram ───────────────────────────────────────────
//
// One month per page. Thin 2px bars were unusable with a thumb, so a month
// now fills the width — roughly 9px per bar with a full-height touch slot —
// and months are reached by swiping sideways rather than scrubbing 90 days.

const HIST_H = 64;
const BAR_GAP = 2;
const MAX_DAYS = 31;
const SLOT_W = CONTENT_W / MAX_DAYS;
const BAR_W = SLOT_W - BAR_GAP;
const TICK_DAYS = [1, 8, 15, 22, 29];

function PriceHistogram({
  months,
  monthIndex,
  selectedDate,
  onSelectDate,
  onMonthIndexChange,
}: {
  months: DayPrice[][];
  monthIndex: number;
  selectedDate: string | null;
  onSelectDate: (d: DayPrice) => void;
  onMonthIndexChange: (i: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const fromSwipe = useRef(false);

  // Normalise across the whole series so months stay comparable
  const { min, max } = useMemo(() => getPriceRange(fareData), []);
  const range = max - min || 1;

  const current = months[monthIndex] ?? [];
  const cheapestInMonth = useMemo(
    () =>
      current.length
        ? current.reduce((a, b) => (b.price < a.price ? b : a)).date
        : null,
    [current],
  );
  const selectedInMonth = current.find((d) => d.date === selectedDate) ?? null;

  // Follow the calendar when the month is changed elsewhere
  useEffect(() => {
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ x: monthIndex * CONTENT_W, animated: true });
  }, [monthIndex]);

  const monthLabel = current.length
    ? `${getMonthName(current[0].month)} ${current[0].year}`
    : '';

  const monthLow = current.length ? Math.min(...current.map((d) => d.price)) : 0;
  const monthHigh = current.length ? Math.max(...current.map((d) => d.price)) : 0;

  return (
    <View style={histStyles.container}>
      {/* Heading */}
      <View style={histStyles.head}>
        <Text variant="label" color="textTertiary" style={{ letterSpacing: 1 }}>
          PRICE RANGE
        </Text>
        {current.length > 0 && (
          <Text variant="caption" color="textTertiary">
            ${monthLow} – ${monthHigh}
          </Text>
        )}
      </View>

      {/* Month pager */}
      <View style={histStyles.monthRow}>
        <Pressable
          onPress={() => monthIndex > 0 && onMonthIndexChange(monthIndex - 1)}
          disabled={monthIndex === 0}
          hitSlop={10}
          style={histStyles.arrow}
        >
          <Feather
            name="chevron-left"
            size={18}
            color={monthIndex === 0 ? palette.gray300 : palette.gray700}
          />
        </Pressable>

        <Text variant="bodyMedium">{monthLabel}</Text>

        <Pressable
          onPress={() =>
            monthIndex < months.length - 1 && onMonthIndexChange(monthIndex + 1)
          }
          disabled={monthIndex >= months.length - 1}
          hitSlop={10}
          style={histStyles.arrow}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={
              monthIndex >= months.length - 1 ? palette.gray300 : palette.gray700
            }
          />
        </Pressable>
      </View>

      {/* Tooltip */}
      <View style={histStyles.tooltipRow}>
        {selectedInMonth ? (
          <View style={histStyles.tooltip}>
            <Text variant="caption" style={{ color: palette.primary700 }}>
              {selectedInMonth.day} {getMonthName(selectedInMonth.month).slice(0, 3)}
              {'  ·  '}
              <Text variant="caption" style={{ color: palette.primary700, fontWeight: '700' }}>
                ${selectedInMonth.price}
              </Text>
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textTertiary">
            Tap a bar to pick a date
          </Text>
        )}
      </View>

      {/* Paged bars */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / CONTENT_W);
          if (page !== monthIndex) {
            fromSwipe.current = true;
            onMonthIndexChange(page);
          }
        }}
      >
        {months.map((days, mi) => (
          <View key={mi} style={histStyles.page}>
            <View style={histStyles.bars}>
              {days.map((d) => {
                const h = ((d.price - min) / range) * HIST_H + 8;
                const isSelected = d.date === selectedDate;
                const isCheapest = d.date === cheapestInMonth;

                return (
                  <Pressable
                    key={d.date}
                    style={histStyles.slot}
                    onPress={() => onSelectDate(d)}
                    hitSlop={{ top: 8, bottom: 8 }}
                  >
                    <View
                      style={[
                        histStyles.bar,
                        {
                          height: h,
                          width: isSelected ? BAR_W + 3 : BAR_W,
                          backgroundColor: isSelected
                            ? palette.primary500
                            : isCheapest
                              ? palette.warning
                              : palette.primary200,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Week ticks */}
            <View style={histStyles.ticks}>
              {days.map((d) => (
                <View key={d.date} style={histStyles.tickSlot}>
                  {TICK_DAYS.includes(d.day) && (
                    <Text
                      variant="caption"
                      color="textTertiary"
                      align="center"
                      style={{ fontSize: 12 }}
                    >
                      {d.day}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={histStyles.legend}>
        <View style={histStyles.legendItem}>
          <View style={[histStyles.swatch, { backgroundColor: palette.warning }]} />
          <Text variant="caption" color="textTertiary">
            Cheapest this month
          </Text>
        </View>
        <View style={histStyles.legendItem}>
          <View style={[histStyles.swatch, { backgroundColor: palette.primary500 }]} />
          <Text variant="caption" color="textTertiary">
            Selected
          </Text>
        </View>
      </View>
    </View>
  );
}

const histStyles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipRow: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tooltip: {
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  page: { width: CONTENT_W },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HIST_H + 8,
  },
  slot: {
    width: SLOT_W,
    height: HIST_H + 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: { borderRadius: 3 },
  ticks: { flexDirection: 'row', marginTop: 4 },
  tickSlot: { width: SLOT_W, alignItems: 'center' },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});

// ─── Cheapest dates strip ────────────────────────────────

function CheapestStrip({
  dates,
  onSelect,
}: {
  dates: DayPrice[];
  onSelect: (d: DayPrice) => void;
}) {
  return (
    <View style={stripStyles.container}>
      <Text variant="label" color="textTertiary" style={stripStyles.title}>
        CHEAPEST DATES
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="md">
          {dates.map((d) => (
            <Pressable
              key={d.date}
              style={stripStyles.chip}
              onPress={() => onSelect(d)}
            >
              <Text variant="caption" color="textSecondary" align="center">
                {getDayAbbr(d.dayOfWeek)}
              </Text>
              <Text variant="h2" align="center">
                {String(d.day).padStart(2, '0')}
              </Text>
              <Text variant="caption" style={{ color: palette.warning }} align="center">
                ${d.price}
              </Text>
            </Pressable>
          ))}
        </Row>
      </ScrollView>
    </View>
  );
}

const stripStyles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  title: { marginBottom: spacing.md, letterSpacing: 1 },
  chip: { alignItems: 'center', minWidth: 48 },
});

// ─── Calendar ────────────────────────────────────────────

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = (CONTENT_W - 6 * spacing.xs) / 7;

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = first.getDay();
  return { daysInMonth, startDay };
}

function Calendar({
  year,
  month,
  selectedDate,
  cheapestDates,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  selectedDate: string | null;
  cheapestDates: Set<string>;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { daysInMonth, startDay } = getCalendarDays(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <View style={calStyles.container}>
      {/* Month nav */}
      <Row justify="space-between" style={calStyles.monthNav}>
        <Pressable onPress={onPrev} hitSlop={12} style={calStyles.navBtn}>
          <Feather name="chevron-left" size={22} color={palette.gray900} />
        </Pressable>
        <Text variant="h1" align="center">
          {getMonthName(month)} {year}
        </Text>
        <Pressable onPress={onNext} hitSlop={12} style={calStyles.navBtn}>
          <Feather name="chevron-right" size={22} color={palette.gray900} />
        </Pressable>
      </Row>

      {/* Day headers */}
      <Row justify="space-between" style={calStyles.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <View key={i} style={calStyles.dowCell}>
            <Text
              variant="caption"
              color="textTertiary"
              align="center"
              style={{ fontWeight: '500' }}
            >
              {label}
            </Text>
          </View>
        ))}
      </Row>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <Row key={wi} justify="space-between" style={calStyles.weekRow}>
          {week.map((cell, ci) => {
            if (!cell) {
              return <View key={`e-${ci}`} style={calStyles.dayCell} />;
            }

            const isSelected = cell.dateStr === selectedDate;
            const isCheapest = cheapestDates.has(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const isPast = cell.dateStr < todayStr;
            const isWeekend = (startDay + cell.day - 1) % 7 === 0 || (startDay + cell.day - 1) % 7 === 6;

            return (
              <Pressable
                key={cell.dateStr}
                style={[
                  calStyles.dayCell,
                  isSelected && calStyles.daySelected,
                  !isSelected && isCheapest && calStyles.dayCheapest,
                  !isSelected && !isCheapest && calStyles.dayDefault,
                ]}
                onPress={() => !isPast && onSelect(cell.dateStr)}
                disabled={isPast}
              >
                <Text
                  variant="body"
                  align="center"
                  style={[
                    { fontWeight: isSelected || isToday ? '600' : '400' },
                    isSelected && { color: palette.white },
                    !isSelected && isCheapest && { color: palette.warning },
                    !isSelected && isPast && { color: palette.gray300 },
                    !isSelected && !isCheapest && !isPast && isWeekend && { color: palette.gray400 },
                  ]}
                >
                  {cell.day}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: {},
  monthNav: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dowRow: {
    marginBottom: spacing.sm,
  },
  dowCell: {
    width: CELL,
    alignItems: 'center',
  },
  weekRow: {
    marginBottom: spacing.sm,
  },
  dayCell: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDefault: {
    backgroundColor: palette.gray50,
  },
  daySelected: {
    backgroundColor: palette.primary500,
  },
  dayCheapest: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.warning,
  },
});

// ─── Main screen ─────────────────────────────────────────

export default function DateSelect() {
  const [currentMonth, setCurrentMonth] = useState(8);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const months = useMemo(() => groupByMonth(fareData), []);

  // The histogram page and the calendar are two views of the same month
  const monthIndex = useMemo(() => {
    const i = months.findIndex(
      (days) => days[0].month === currentMonth && days[0].year === currentYear,
    );
    return i === -1 ? 0 : i;
  }, [months, currentMonth, currentYear]);

  const goToMonthIndex = useCallback(
    (i: number) => {
      const days = months[i];
      if (!days) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentMonth(days[0].month);
      setCurrentYear(days[0].year);
    },
    [months],
  );
  const cheapest7 = useMemo(() => getCheapestDates(fareData, 7), []);
  const cheapestDateSet = useMemo(
    () => new Set(cheapest7.map((d) => d.date)),
    [cheapest7],
  );

  // Selected date display
  const selectedDisplay = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = getDayAbbr(dt.getDay());
    return `${d} ${getMonthName(m)} ${y}`;
  }, [selectedDate]);

  // Price for selected date
  const selectedPrice = useMemo(() => {
    if (!selectedDate) return null;
    const found = fareData.find((d) => d.date === selectedDate);
    return found ? found.price : null;
  }, [selectedDate]);

  const handlePrev = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNext = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleCheapSelect = useCallback((d: DayPrice) => {
    handleDateSelect(d.date);
    if (d.month !== currentMonth || d.year !== currentYear) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentMonth(d.month);
      setCurrentYear(d.year);
    }
  }, [currentMonth, currentYear, handleDateSelect]);

  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <Row justify="space-between" style={styles.header}>
        <View style={styles.datePill}>
          <Text style={{ fontSize: 18 }}>📅</Text>
          <Text variant="bodySmall">
            {selectedDisplay || 'Select a date'}
          </Text>
          {selectedPrice && (
            <View style={styles.priceBadge}>
              <Text variant="caption" style={{ color: palette.warning, fontWeight: '600' }}>
                ${selectedPrice}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
          }}
        >
          <Feather name="x" size={20} color={palette.gray600} />
        </Pressable>
      </Row>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Histogram */}
        <PriceHistogram
          months={months}
          monthIndex={monthIndex}
          selectedDate={selectedDate}
          onSelectDate={handleCheapSelect}
          onMonthIndexChange={goToMonthIndex}
        />

        {/* Cheapest dates */}
        <CheapestStrip dates={cheapest7} onSelect={handleCheapSelect} />

        {/* Calendar */}
        <Calendar
          year={currentYear}
          month={currentMonth}
          selectedDate={selectedDate}
          cheapestDates={cheapestDateSet}
          onSelect={handleDateSelect}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <Button
          label={selectedDate ? 'Continue' : 'Select a date'}
          onPress={() => {
            if (!selectedDate) return;
            router.push('/flights');
          }}
          rounded
          disabled={!selectedDate}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.white,
  },
  header: {
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  priceBadge: {
    backgroundColor: palette.warningLight || '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  ctaContainer: {
    paddingHorizontal: HPAD,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
});
