import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing, radii, shadows } from '../constants/tokens';
import {
  formatFlightTime,
  cheapestMonth,
  priceBounds,
  type Destination,
} from '../data/destinations';
import { isFavorite, toggleFavorite, subscribeFavorites } from '../data/favorites';
import { WeatherIcon } from './WeatherIcon';
import { weatherFor } from '../data/weather';

const { width: SW, height: SH } = Dimensions.get('window');
const HPAD = spacing.lg;
const CONTENT_W = SW - HPAD * 2;

const SHEET_H = SH * 0.9;
const DISMISS_AT = SHEET_H * 0.32;

const HERO_H = 200;
const CHART_H = 68;
const SLOT_W = CONTENT_W / 12;
const BAR_W = SLOT_W - 6;

export function DestinationSheet({
  destination,
  originIata,
  visible,
  onClose,
  onFindFlights,
}: {
  destination: Destination | null;
  originIata: string;
  visible: boolean;
  onClose: () => void;
  onFindFlights: (d: Destination, month: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [favTick, setFavTick] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => subscribeFavorites(() => setFavTick((n) => n + 1)), []);

  useEffect(() => {
    if (visible) {
      setActiveMonth(null);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 62,
        friction: 11,
      }).start();
    } else {
      translateY.setValue(SHEET_H);
    }
  }, [visible, translateY]);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_AT || g.vy > 0.8) dismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 62,
            friction: 11,
          }).start();
      },
    }),
  ).current;

  const cheapest = useMemo(
    () => (destination ? cheapestMonth(destination) : null),
    [destination],
  );
  const bounds = useMemo(
    () => (destination ? priceBounds(destination) : { min: 0, max: 1 }),
    [destination],
  );

  if (!destination) return null;

  const selected = activeMonth
    ? destination.prices.find((p) => p.month === activeMonth)
    : null;
  const saving = destination.typicalPrice - destination.fromPrice;
  const saved = isFavorite(destination.id);
  const wx = weatherFor(`${destination.city}-${destination.iata}`);
  void favTick;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={dismiss} />

        <Animated.View
          style={[
            s.sheet,
            { height: SHEET_H + insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
            bounces={false}
          >
            {/* Hero */}
            <View {...pan.panHandlers} style={s.hero}>
              <Image source={{ uri: destination.image }} style={s.heroImage} />
              <View style={s.heroScrim} />
              <View style={s.handle} />

              <Pressable style={s.heroClose} onPress={dismiss} hitSlop={10}>
                <Feather name="x" size={20} color={palette.white} />
              </Pressable>

              <View style={s.heroText}>
                <Text style={s.heroCity}>{destination.city}</Text>
                <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {destination.country} · {destination.iata}
                </Text>
              </View>
            </View>

            <View style={s.body}>
              {/* Weather + save — lived here so cards stay calm */}
              <View style={s.contextRow}>
                <View style={s.weatherChip}>
                  <WeatherIcon kind={wx.kind} size={26} />
                  <View>
                    <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                      {wx.tempC}°
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {wx.label} now
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={[s.saveChip, saved && s.saveChipOn]}
                  onPress={() => toggleFavorite(destination.id)}
                  accessibilityLabel={saved ? 'Remove from saved' : 'Save destination'}
                >
                  <Feather
                    name="heart"
                    size={16}
                    color={saved ? palette.error : palette.primary600}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: saved ? palette.error : palette.primary700,
                      fontWeight: '600',
                    }}
                  >
                    {saved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              </View>

              {/* Quick facts */}
              <View style={s.facts}>
                <Fact
                  icon="clock"
                  label="Flight time"
                  value={formatFlightTime(destination.flightMinutes)}
                />
                <View style={s.factDivider} />
                <Fact
                  icon="git-commit"
                  label="Routing"
                  value={destination.direct ? 'Direct' : '1 stop'}
                />
                <View style={s.factDivider} />
                <Fact
                  icon="tag"
                  label="From"
                  value={`₹${destination.fromPrice.toLocaleString()}`}
                  accent
                />
              </View>

              {saving > 0 && (
                <View style={s.dealBar}>
                  <Feather name="trending-down" size={14} color={palette.successDark} />
                  <Text variant="caption" style={{ color: palette.successDark, flex: 1 }}>
                    ₹{saving.toLocaleString()} below the usual ₹
                    {destination.typicalPrice.toLocaleString()} fare
                  </Text>
                </View>
              )}

              {/* Price by month */}
              <Text variant="label" color="textTertiary" style={s.sectionLabel}>
                FARES THROUGH THE YEAR
              </Text>

              <View style={s.chartHint}>
                {selected ? (
                  <View style={s.chartPill}>
                    <Text variant="caption" style={{ color: palette.primary700 }}>
                      {selected.month}
                      {'  ·  '}
                      <Text
                        variant="caption"
                        style={{ color: palette.primary700, fontWeight: '700' }}
                      >
                        ₹{selected.price.toLocaleString()}
                      </Text>
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" color="textTertiary">
                    Cheapest in {cheapest!.month} at ₹{cheapest!.price.toLocaleString()}
                  </Text>
                )}
              </View>

              <View style={s.chart}>
                {destination.prices.map((p) => {
                  const range = bounds.max - bounds.min || 1;
                  const h = ((p.price - bounds.min) / range) * CHART_H + 10;
                  const isCheapest = p.month === cheapest!.month;
                  const isActive = p.month === activeMonth;
                  const isBest = destination.bestMonths.includes(p.month);

                  return (
                    <Pressable
                      key={p.month}
                      style={s.chartSlot}
                      onPress={() => setActiveMonth(isActive ? null : p.month)}
                      hitSlop={{ top: 8, bottom: 4 }}
                    >
                      <View
                        style={[
                          s.chartBar,
                          {
                            height: h,
                            width: isActive ? BAR_W + 3 : BAR_W,
                            backgroundColor: isActive
                              ? palette.primary500
                              : isCheapest
                                ? palette.warning
                                : isBest
                                  ? palette.primary300
                                  : palette.gray200,
                          },
                        ]}
                      />
                      <Text
                        variant="caption"
                        color="textTertiary"
                        align="center"
                        style={{ marginTop: 5 }}
                      >
                        {p.month.charAt(0)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.legend}>
                <LegendDot color={palette.warning} label="Cheapest" />
                <LegendDot color={palette.primary300} label="Best weather" />
              </View>

              {/* When to go */}
              <Text variant="label" color="textTertiary" style={s.sectionLabel}>
                WHEN TO GO
              </Text>
              <View style={s.monthChips}>
                {destination.bestMonths.map((m) => (
                  <View key={m} style={s.monthChip}>
                    <Text variant="caption" style={{ color: palette.primary700 }}>
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.sm }}>
                {destination.seasonNote}
              </Text>

              {/* Why */}
              <Text variant="label" color="textTertiary" style={s.sectionLabel}>
                WHY NOW
              </Text>
              {destination.reasons.map((r) => (
                <View key={r} style={s.reason}>
                  <View style={s.reasonDot}>
                    <Feather name="check" size={12} color={palette.primary600} />
                  </View>
                  <Text variant="bodySmall" style={{ flex: 1 }}>
                    {r}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Sticky CTA */}
          <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textTertiary">
                {originIata} → {destination.iata}
                {activeMonth ? ` · ${activeMonth}` : ''}
              </Text>
              <Text style={s.footerPrice}>
                ₹
                {(selected
                  ? selected.price
                  : destination.fromPrice
                ).toLocaleString()}
              </Text>
            </View>
            <Pressable
              style={s.cta}
              onPress={() => onFindFlights(destination, activeMonth)}
            >
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Find flights
              </Text>
              <Feather name="arrow-right" size={17} color={palette.white} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Fact({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={s.fact}>
      <Feather name={icon as never} size={14} color={palette.gray500} />
      <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: accent ? palette.warning : palette.gray900 }}
      >
        {value}
      </Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.swatch, { backgroundColor: color }]} />
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.sheet,
  },

  hero: { height: HERO_H, justifyContent: 'flex-end' },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  handle: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroClose: {
    position: 'absolute',
    top: spacing.lg,
    right: HPAD,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { padding: HPAD },
  heroCity: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: palette.white,
    letterSpacing: -0.5,
  },

  body: { paddingHorizontal: HPAD, paddingTop: spacing.lg },

  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  saveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    borderRadius: radii.full,
    backgroundColor: palette.primary50,
    borderWidth: 1,
    borderColor: palette.primary100,
  },
  saveChipOn: {
    backgroundColor: palette.errorLight,
    borderColor: '#FECACA',
  },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  fact: { flex: 1, alignItems: 'center' },
  factDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: palette.gray200,
  },

  dealBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.successLight,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.md,
  },

  sectionLabel: { letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },

  chartHint: { height: 26, justifyContent: 'center', marginBottom: spacing.xs },
  chartPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  chartSlot: { width: SLOT_W, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 3 },

  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },

  monthChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthChip: {
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },

  reason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reasonDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  footerPrice: {
    fontSize: 21,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 26,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radii.full,
  },
});
