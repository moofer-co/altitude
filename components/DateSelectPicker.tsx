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
import { layout, palette, spacing, radii } from '../constants/tokens';
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
const HPAD = layout.screenPadding;
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
  departDate,
  returnDate,
  cheapestDates,
  minDate,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  departDate: string | null;
  returnDate: string | null;
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

            const isStart = cell.dateStr === departDate;
            const isEnd = returnDate != null && cell.dateStr === returnDate;
            const inMiddle =
              !!departDate &&
              !!returnDate &&
              cell.dateStr > departDate &&
              cell.dateStr < returnDate;
            const inRange = isStart || isEnd || inMiddle;
            const isEndpoint = isStart || isEnd;
            const isCheapest = cheapestDates.has(cell.dateStr);
            const isPast = cell.dateStr < floor;

            return (
              <Pressable
                key={cell.dateStr}
                style={[
                  calStyles.dayCell,
                  inMiddle && calStyles.dayInRange,
                  isStart && returnDate && calStyles.dayRangeStart,
                  isEnd && calStyles.dayRangeEnd,
                  isEndpoint && calStyles.daySelected,
                  !inRange && isCheapest && calStyles.dayCheapest,
                  !inRange && !isCheapest && calStyles.dayDefault,
                ]}
                onPress={() => !isPast && onSelect(cell.dateStr)}
                disabled={isPast}
              >
                <Text
                  variant="bodySmall"
                  align="center"
                  style={{
                    color: isEndpoint
                      ? palette.white
                      : isPast
                        ? palette.gray300
                        : inMiddle
                          ? palette.primary700
                          : palette.gray900,
                    fontWeight: isEndpoint || inMiddle ? '700' : '500',
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
  dayInRange: {
    backgroundColor: palette.primary100,
    borderRadius: 0,
  },
  dayRangeStart: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: palette.primary500,
  },
  dayRangeEnd: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
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

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** e.g. "Tue, 3 August" */
export function formatFieldDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS_SHORT[dt.getDay()]}, ${d} ${getMonthName(m)}`;
}

export type DateSelectResult = {
  depart: string;
  returnDate: string | null;
};

/**
 * Full date selection UI (price range, cheapest dates, calendar).
 * Used as a page and inside a sheet for multi-city.
 * `allowReturn` enables depart/return fields and calendar range selection.
 */
export function DateSelectPicker({
  initialDate = null,
  initialReturnDate = null,
  minDate = null,
  confirmLabel = 'Continue',
  allowReturn = false,
  onConfirm,
  onClose,
  embedded = false,
}: {
  initialDate?: string | null;
  initialReturnDate?: string | null;
  minDate?: string | null;
  confirmLabel?: string;
  /** When true, show Depart/Return fields and range selection. */
  allowReturn?: boolean;
  onConfirm: (result: DateSelectResult) => void;
  onClose?: () => void;
  /** Hide page chrome when shown inside a sheet that already has a title. */
  embedded?: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(8);
  const [currentYear, setCurrentYear] = useState(2026);
  const [departDate, setDepartDate] = useState<string | null>(initialDate);
  const [returnDate, setReturnDate] = useState<string | null>(
    allowReturn ? initialReturnDate : null,
  );
  const [focus, setFocus] = useState<'depart' | 'return'>('depart');

  useEffect(() => {
    setDepartDate(initialDate);
    setReturnDate(allowReturn ? initialReturnDate : null);
    if (initialDate) {
      const [y, m] = initialDate.split('-').map(Number);
      setCurrentMonth(m);
      setCurrentYear(y);
    }
  }, [initialDate, initialReturnDate, allowReturn]);

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

  const headerLabel = useMemo(() => {
    if (!departDate) return 'Select a date';
    if (returnDate) {
      return `${formatShortDate(departDate)} – ${formatShortDate(returnDate)}`;
    }
    const [y, m, d] = departDate.split('-').map(Number);
    return `${d} ${getMonthName(m)} ${y}`;
  }, [departDate, returnDate]);

  const selectedPrice = useMemo(() => {
    if (!departDate) return null;
    const found = fareData.find((d) => d.date === departDate);
    return found ? found.price : null;
  }, [departDate]);

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

  const jumpToDate = useCallback((iso: string) => {
    const [y, m] = iso.split('-').map(Number);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonth(m);
    setCurrentYear(y);
  }, []);

  const handleDateSelect = useCallback(
    (date: string) => {
      if (!allowReturn) {
        setDepartDate(date);
        return;
      }

      if (focus === 'depart') {
        setDepartDate(date);
        if (returnDate && returnDate < date) {
          setReturnDate(null);
        }
        return;
      }

      // Return focus
      if (!departDate || date < departDate) {
        // Start a new range from this date
        setDepartDate(date);
        setReturnDate(null);
        setFocus('return');
        return;
      }
      if (date === departDate) {
        // Same day — clear return (one-way for that day)
        setReturnDate(null);
        return;
      }
      setReturnDate(date);
    },
    [allowReturn, focus, departDate, returnDate],
  );

  const handleCheapSelect = useCallback(
    (d: DayPrice) => {
      handleDateSelect(d.date);
      if (d.month !== currentMonth || d.year !== currentYear) {
        jumpToDate(d.date);
      }
    },
    [currentMonth, currentYear, handleDateSelect, jumpToDate],
  );

  const clearReturn = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReturnDate(null);
    setFocus('depart');
  };

  const canContinue = !!departDate;

  return (
    <View style={styles.root}>
      {!embedded && (
        <Row justify="space-between" style={styles.header}>
          <View style={styles.datePill}>
            <Feather name="calendar" size={16} color={palette.primary600} />
            <Text variant="bodySmall" numberOfLines={1}>
              {headerLabel}
            </Text>
            {selectedPrice != null && !returnDate && (
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
            <Text variant="bodySmall" numberOfLines={1}>
              {headerLabel}
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
          selectedDate={departDate}
          onSelectDate={handleCheapSelect}
          onMonthIndexChange={goToMonthIndex}
        />
        <CheapestStrip dates={cheapest7} onSelect={handleCheapSelect} />
        <Calendar
          year={currentYear}
          month={currentMonth}
          departDate={departDate}
          returnDate={allowReturn ? returnDate : null}
          cheapestDates={cheapestDateSet}
          minDate={minDate}
          onSelect={handleDateSelect}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </ScrollView>

      <View style={styles.ctaContainer}>
        {allowReturn && (
          <View style={styles.fields}>
            <Pressable
              style={[styles.field, focus === 'depart' && styles.fieldOn]}
              onPress={() => setFocus('depart')}
              accessibilityRole="button"
              accessibilityLabel="Depart date"
            >
              <Text variant="caption" color="textTertiary">
                Depart
              </Text>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={!departDate ? styles.fieldPlaceholder : undefined}
              >
                {departDate ? formatFieldDate(departDate) : 'Select date'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.field, focus === 'return' && styles.fieldOn]}
              onPress={() => {
                if (!departDate) {
                  setFocus('depart');
                  return;
                }
                setFocus('return');
              }}
              onLongPress={returnDate ? clearReturn : undefined}
              accessibilityRole="button"
              accessibilityLabel="Return date"
            >
              <View style={styles.fieldLabelRow}>
                <Text variant="caption" color="textTertiary">
                  Return
                </Text>
                {returnDate ? (
                  <Pressable onPress={clearReturn} hitSlop={8}>
                    <Feather name="x" size={14} color={palette.gray400} />
                  </Pressable>
                ) : null}
              </View>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={!returnDate ? styles.fieldPlaceholder : undefined}
              >
                {returnDate ? formatFieldDate(returnDate) : 'Add return'}
              </Text>
            </Pressable>
          </View>
        )}

        <Button
          label={
            !departDate
              ? 'Select a date'
              : returnDate
                ? `${confirmLabel} · round trip`
                : `${confirmLabel} · ${formatShortDate(departDate)}`
          }
          onPress={() => {
            if (!departDate) return;
            onConfirm({
              depart: departDate,
              returnDate: allowReturn ? returnDate : null,
            });
          }}
          rounded
          disabled={!canContinue}
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
    maxWidth: '82%',
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
    gap: spacing.md,
  },
  fields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
  },
  fieldOn: {
    borderColor: palette.primary400,
    backgroundColor: palette.primary50,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldPlaceholder: {
    color: palette.gray400,
    fontWeight: '500',
  },
});
