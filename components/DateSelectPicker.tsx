import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Row } from './ui';
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

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / CONTENT_W);
          if (i !== monthIndex && i >= 0 && i < months.length) {
            fromSwipe.current = true;
            onMonthIndexChange(i);
          }
        }}
      >
        {months.map((days, mi) => (
          <View key={mi} style={{ width: CONTENT_W, height: HIST_H + 28 }}>
            <View style={histStyles.bars}>
              {Array.from({ length: MAX_DAYS }, (_, i) => {
                const d = days.find((x) => x.day === i + 1);
                if (!d) {
                  return <View key={i} style={{ width: SLOT_W }} />;
                }
                const h = Math.max(6, ((d.price - min) / range) * HIST_H);
                const selected = d.date === selectedDate;
                const cheapest = d.date === cheapestInMonth;
                return (
                  <Pressable
                    key={d.date}
                    onPress={() => onSelectDate(d)}
                    style={[histStyles.slot, { width: SLOT_W }]}
                  >
                    <View
                      style={[
                        histStyles.bar,
                        {
                          width: BAR_W,
                          height: h,
                          backgroundColor: selected
                            ? palette.primary500
                            : cheapest
                              ? palette.info
                              : palette.primary100,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={histStyles.ticks}>
              {TICK_DAYS.map((day) => (
                <Text
                  key={day}
                  variant="caption"
                  color="textTertiary"
                  style={[histStyles.tick, { left: (day - 1) * SLOT_W }]}
                >
                  {day}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selectedInMonth && (
        <Text variant="caption" color="textSecondary" style={histStyles.selectedNote}>
          {selectedInMonth.day} {getMonthName(selectedInMonth.month).slice(0, 3)} · $
          {selectedInMonth.price}
        </Text>
      )}
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
    marginBottom: spacing.sm,
  },
  arrow: { padding: 4 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HIST_H,
  },
  slot: {
    height: HIST_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: { borderRadius: 2 },
  ticks: { height: 18, position: 'relative', marginTop: 4 },
  tick: { position: 'absolute', width: SLOT_W, textAlign: 'center', fontSize: 10 },
  selectedNote: { marginTop: spacing.sm },
});

function CheapestStrip({
  dates,
  onSelect,
}: {
  dates: DayPrice[];
  onSelect: (d: DayPrice) => void;
}) {
  return (
    <View style={cheapStyles.container}>
      <Text variant="label" color="textTertiary" style={{ letterSpacing: 1 }}>
        CHEAPEST DATES
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cheapStyles.strip}
      >
        {dates.map((d) => (
          <Pressable key={d.date} style={cheapStyles.chip} onPress={() => onSelect(d)}>
            <Text variant="caption" color="textTertiary">
              {getDayAbbr(new Date(d.year, d.month - 1, d.day).getDay())}
            </Text>
            <Text variant="bodyMedium">{d.day}</Text>
            <Text
              variant="caption"
              style={{ color: palette.warning, fontWeight: '600' }}
            >
              ${d.price}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const cheapStyles = StyleSheet.create({
  container: { marginBottom: spacing.lg, gap: spacing.sm },
  strip: { gap: spacing.sm, paddingRight: spacing.md },
  chip: {
    width: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.gray50,
  },
});

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  minDate,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  selectedDate: string | null;
  cheapestDates: Set<string>;
  minDate?: string | null;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { daysInMonth, startDay } = getCalendarDays(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const floor = minDate && minDate > todayStr ? minDate : todayStr;

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

      {weeks.map((week, wi) => (
        <Row key={wi} justify="space-between" style={calStyles.weekRow}>
          {week.map((cell, ci) => {
            if (!cell) {
              return <View key={`e-${ci}`} style={calStyles.dayCell} />;
            }

            const isSelected = cell.dateStr === selectedDate;
            const isCheapest = cheapestDates.has(cell.dateStr);
            const isPast = cell.dateStr < floor;

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
                  variant="bodySmall"
                  align="center"
                  style={{
                    color: isSelected
                      ? palette.white
                      : isPast
                        ? palette.gray300
                        : palette.gray900,
                    fontWeight: isSelected ? '700' : '500',
                    opacity: isPast ? 0.5 : 1,
                  }}
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
  container: { marginBottom: spacing.md },
  monthNav: { marginBottom: spacing.md, alignItems: 'center' },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray50,
  },
  dowRow: { marginBottom: spacing.xs },
  dowCell: { width: 40, alignItems: 'center' },
  weekRow: { marginBottom: 6 },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

export function formatShortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${getMonthName(m).slice(0, 3)}`;
}

/**
 * Full date selection UI (price range, cheapest dates, calendar).
 * Used as a page and inside a sheet for multi-city.
 */
export function DateSelectPicker({
  initialDate = null,
  minDate = null,
  confirmLabel = 'Continue',
  onConfirm,
  onClose,
  embedded = false,
}: {
  initialDate?: string | null;
  minDate?: string | null;
  confirmLabel?: string;
  onConfirm: (date: string) => void;
  onClose?: () => void;
  /** Hide page chrome when shown inside a sheet that already has a title. */
  embedded?: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(8);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);

  useEffect(() => {
    setSelectedDate(initialDate);
    if (initialDate) {
      const [y, m] = initialDate.split('-').map(Number);
      setCurrentMonth(m);
      setCurrentYear(y);
    }
  }, [initialDate]);

  const months = useMemo(() => groupByMonth(fareData), []);

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

  const selectedDisplay = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return `${d} ${getMonthName(m)} ${y}`;
  }, [selectedDate]);

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

  const handleCheapSelect = useCallback(
    (d: DayPrice) => {
      handleDateSelect(d.date);
      if (d.month !== currentMonth || d.year !== currentYear) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentMonth(d.month);
        setCurrentYear(d.year);
      }
    },
    [currentMonth, currentYear, handleDateSelect],
  );

  return (
    <View style={styles.root}>
      {!embedded && (
        <Row justify="space-between" style={styles.header}>
          <View style={styles.datePill}>
            <Feather name="calendar" size={16} color={palette.primary600} />
            <Text variant="bodySmall">
              {selectedDisplay || 'Select a date'}
            </Text>
            {selectedPrice != null && (
              <View style={styles.priceBadge}>
                <Text
                  variant="caption"
                  style={{ color: palette.warning, fontWeight: '600' }}
                >
                  ${selectedPrice}
                </Text>
              </View>
            )}
          </View>
          {onClose ? (
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={6}>
              <Feather name="x" size={20} color={palette.gray600} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </Row>
      )}

      {embedded && (
        <View style={styles.embeddedPillWrap}>
          <View style={styles.datePill}>
            <Feather name="calendar" size={16} color={palette.primary600} />
            <Text variant="bodySmall">
              {selectedDisplay || 'Select a date'}
            </Text>
            {selectedPrice != null && (
              <View style={styles.priceBadge}>
                <Text
                  variant="caption"
                  style={{ color: palette.warning, fontWeight: '600' }}
                >
                  ${selectedPrice}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PriceHistogram
          months={months}
          monthIndex={monthIndex}
          selectedDate={selectedDate}
          onSelectDate={handleCheapSelect}
          onMonthIndexChange={goToMonthIndex}
        />
        <CheapestStrip dates={cheapest7} onSelect={handleCheapSelect} />
        <Calendar
          year={currentYear}
          month={currentMonth}
          selectedDate={selectedDate}
          cheapestDates={cheapestDateSet}
          minDate={minDate}
          onSelect={handleDateSelect}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </ScrollView>

      <View style={styles.ctaContainer}>
        <Button
          label={
            selectedDate
              ? `${confirmLabel} · ${formatShortDate(selectedDate)}`
              : 'Select a date'
          }
          onPress={() => {
            if (!selectedDate) return;
            onConfirm(selectedDate);
          }}
          rounded
          disabled={!selectedDate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.white,
  },
  header: {
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
  },
  embeddedPillWrap: {
    paddingHorizontal: HPAD,
    paddingBottom: spacing.sm,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexShrink: 1,
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
