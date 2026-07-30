import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
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
import { layout, palette, spacing, radii, shadows } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import {
  getFareClasses,
  getUpgrades,
  getRecommendedFareId,
  compareRows,
  refundLabel,
  feeLabel,
  type FareClass,
} from '../data/fares';

const { height: SH } = Dimensions.get('window');
const HPAD = layout.screenPadding;

const SHEET_H = SH * 0.9;
const SNAP_FULL = 0;
const SNAP_HALF = SHEET_H * 0.38;
const DISMISS_AT = SHEET_H * 0.72;

type ViewMode = 'cards' | 'compare';

// ─── Compare table sizing ────────────────────────────────

const LABEL_COL_W = 112;
const FARE_COL_W = 130;

// ═══════════════════════════════════════════════════════════
// Fare card
// ═══════════════════════════════════════════════════════════

function FareCard({
  fare,
  prevFare,
  cheapest,
  isRecommended,
  isSelected,
  onSelect,
}: {
  fare: FareClass;
  prevFare: FareClass | null;
  cheapest: FareClass;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const premium = fare.price - cheapest.price;
  const upgrades = prevFare ? getUpgrades(prevFare, fare) : [];

  return (
    <Pressable
      onPress={onSelect}
      style={[
        cardStyles.card,
        isSelected && cardStyles.cardSelected,
        isRecommended && !isSelected && cardStyles.cardRecommended,
      ]}
    >
      {isRecommended && (
        <View style={cardStyles.ribbon}>
          <Feather name="zap" size={11} color={palette.white} />
          <Text style={cardStyles.ribbonText}>BEST VALUE FOR MONEY</Text>
        </View>
      )}

      {/* Name + price */}
      <View style={cardStyles.head}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.name}>{fare.name.toUpperCase()}</Text>
          {premium > 0 ? (
            <Text variant="caption" color="textTertiary">
              +₹{premium.toLocaleString()} over {cheapest.name}
            </Text>
          ) : (
            <Text variant="caption" color="textTertiary">Lowest fare</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cardStyles.price}>₹{fare.price.toLocaleString()}</Text>
          <Text variant="caption" color="textTertiary">per traveller</Text>
        </View>
      </View>

      {/* What you gain */}
      {upgrades.length > 0 && (
        <View style={cardStyles.upgrades}>
          <Text variant="caption" color="textTertiary" style={{ marginBottom: 6 }}>
            Adds over {prevFare!.name}
          </Text>
          <View style={cardStyles.chipWrap}>
            {upgrades.map((u) => (
              <View key={u} style={cardStyles.chip}>
                <Feather name="plus" size={10} color={palette.primary600} />
                <Text style={cardStyles.chipText}>{u}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Attribute grid */}
      <View style={cardStyles.grid}>
        <GridItem
          icon="briefcase"
          label="Cabin"
          value={`${fare.cabinKg} kg`}
          good
        />
        <GridItem
          icon="package"
          label="Check-in"
          value={fare.checkInKg === 0 ? 'None' : `${fare.checkInKg} kg`}
          good={fare.checkInKg > 0}
        />
        <GridItem
          icon="coffee"
          label="Meal"
          value={fare.mealIncluded ? 'Included' : 'Buy on board'}
          good={fare.mealIncluded}
        />
        <GridItem
          icon="grid"
          label="Seat"
          value={fare.seatSelection}
          good={fare.seatFree}
        />
        <GridItem
          icon="calendar"
          label="Change"
          value={feeLabel(fare.changeFee)}
          good={fare.changeFee === 0}
        />
        <GridItem
          icon="rotate-ccw"
          label="Refund"
          value={
            fare.refundable === 'full'
              ? 'Full'
              : fare.refundable === 'partial'
                ? 'Partial'
                : 'None'
          }
          good={fare.refundable !== 'none'}
        />
      </View>

      {/* Select */}
      <View style={cardStyles.footer}>
        <Text variant="caption" color="textSecondary">
          {refundLabel(fare.refundable)}
          {fare.cancelFee > 0 && ` · ₹${fare.cancelFee.toLocaleString()} to cancel`}
        </Text>
        <View style={[cardStyles.selectBtn, isSelected && cardStyles.selectBtnOn]}>
          {isSelected && <Feather name="check" size={14} color={palette.white} />}
          <Text
            variant="bodySmall"
            style={{
              color: isSelected ? palette.white : palette.primary600,
              fontWeight: '600',
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function GridItem({
  icon,
  label,
  value,
  good,
}: {
  icon: string;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <View style={cardStyles.gridItem}>
      <Feather
        name={icon as never}
        size={13}
        color={good ? palette.gray600 : palette.gray400}
      />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
        <Text
          variant="caption"
          style={{ color: good ? palette.gray900 : palette.gray400 }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.white,
  },
  cardSelected: {
    borderColor: palette.primary500,
    borderWidth: 2,
    backgroundColor: palette.primary50,
  },
  cardRecommended: {
    borderColor: palette.primary300,
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  ribbonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.gray900,
    marginBottom: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 27,
  },
  upgrades: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  chipText: {
    fontSize: 12,
    color: palette.primary700,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  gridItem: {
    width: '33.33%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingRight: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: palette.primary500,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  selectBtnOn: {
    backgroundColor: palette.primary500,
    borderColor: palette.primary500,
  },
});

// ═══════════════════════════════════════════════════════════
// Compare table
// ═══════════════════════════════════════════════════════════

const ROW_H = 56;
const HEAD_H = 100;
const ACTION_H = 60;

function CompareTable({
  fares,
  cheapest,
  selectedId,
  recommendedId,
  onSelect,
}: {
  fares: FareClass[];
  cheapest: FareClass;
  selectedId: string | null;
  recommendedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={tblStyles.wrap}>
      {/* Pinned attribute column */}
      <View style={tblStyles.labelCol}>
        <View style={tblStyles.headCell}>
          <Text variant="caption" color="textTertiary">
            Compare
          </Text>
        </View>

        {compareRows.map((row) => (
          <View key={row.label} style={tblStyles.labelCell}>
            <Feather name={row.icon as never} size={14} color={palette.gray500} />
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {row.label}
            </Text>
          </View>
        ))}

        <View style={tblStyles.actionCell} />
      </View>

      {/* Scrolling fare columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: HPAD }}
      >
        {fares.map((fare) => {
          const isSelected = fare.id === selectedId;
          const premium = fare.price - cheapest.price;

          return (
            <View
              key={fare.id}
              style={[tblStyles.col, isSelected && tblStyles.colSelected]}
            >
              {/* Column head */}
              <View style={tblStyles.headCell}>
                {fare.id === recommendedId && (
                  <View style={tblStyles.bestTag}>
                    <Feather name="zap" size={10} color={palette.white} />
                    <Text style={tblStyles.bestTagText}>BEST</Text>
                  </View>
                )}
                <Text style={tblStyles.colName} numberOfLines={1}>
                  {fare.name.toUpperCase()}
                </Text>
                <Text style={tblStyles.colPrice} numberOfLines={1}>
                  ₹{fare.price.toLocaleString()}
                </Text>
                <Text variant="caption" color="textTertiary" numberOfLines={1}>
                  {premium === 0 ? 'Base fare' : `+₹${premium.toLocaleString()}`}
                </Text>
              </View>

              {/* Values */}
              {compareRows.map((row) => {
                const value = row.render(fare);
                const best = row.isBest?.(fare, fares) ?? false;
                return (
                  <View key={row.label} style={tblStyles.valueCell}>
                    {best && (
                      <Feather
                        name="check"
                        size={12}
                        color={palette.primary600}
                        style={{ marginBottom: 2 }}
                      />
                    )}
                    <Text
                      variant="caption"
                      numberOfLines={2}
                      align="center"
                      style={{
                        color: best ? palette.primary600 : palette.gray700,
                        fontWeight: best ? '600' : '400',
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                );
              })}

              {/* Action */}
              <View style={tblStyles.actionCell}>
                <Pressable
                  style={[tblStyles.pickBtn, isSelected && tblStyles.pickBtnOn]}
                  onPress={() => onSelect(fare.id)}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? palette.white : palette.primary600,
                      fontWeight: '600',
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const tblStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingLeft: HPAD },
  labelCol: {
    width: LABEL_COL_W,
    borderRightWidth: 1,
    borderRightColor: palette.gray200,
  },
  headCell: {
    height: HEAD_H,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  labelCell: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
  },
  actionCell: {
    height: ACTION_H,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  col: {
    width: FARE_COL_W,
    paddingHorizontal: spacing.sm,
  },
  colSelected: {
    backgroundColor: palette.primary50,
    borderRadius: radii.md,
  },
  bestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    backgroundColor: palette.primary500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginBottom: 5,
  },
  bestTagText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  colName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: palette.gray900,
    lineHeight: 16,
  },
  colPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 24,
    marginTop: 1,
  },
  valueCell: {
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
    paddingHorizontal: 2,
  },
  pickBtn: {
    borderWidth: 1.5,
    borderColor: palette.primary500,
    borderRadius: radii.full,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pickBtnOn: {
    backgroundColor: palette.primary500,
  },
});

// ═══════════════════════════════════════════════════════════
// Sheet
// ═══════════════════════════════════════════════════════════

export function FareSheet({
  flight,
  visible,
  onClose,
  onConfirm,
}: {
  flight: MockFlight | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (fare: FareClass) => void;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ViewMode>('cards');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const currentSnap = useRef(SNAP_FULL);

  const fares = useMemo(
    () => (flight ? getFareClasses(flight) : []),
    [flight],
  );
  const cheapest = fares[0];
  const recommendedId = useMemo(
    () => (fares.length ? getRecommendedFareId(fares) : ''),
    [fares],
  );
  const selectedFare = fares.find((f) => f.id === selectedId) ?? null;

  // Open / close animation
  useEffect(() => {
    if (visible) {
      setMode('cards');
      setSelectedId(recommendedId || null);
      currentSnap.current = SNAP_FULL;
      Animated.spring(translateY, {
        toValue: SNAP_FULL,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      translateY.setValue(SHEET_H);
    }
  }, [visible, recommendedId, translateY]);

  const snapTo = useCallback(
    (to: number) => {
      currentSnap.current = to;
      Animated.spring(translateY, {
        toValue: to,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    },
    [translateY],
  );

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  // Drag handling
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        const next = currentSnap.current + g.dy;
        translateY.setValue(Math.max(SNAP_FULL, next));
      },
      onPanResponderRelease: (_, g) => {
        const landed = currentSnap.current + g.dy;
        const flungDown = g.vy > 0.8;
        const flungUp = g.vy < -0.8;

        if (landed > DISMISS_AT || (flungDown && landed > SNAP_HALF)) {
          dismiss();
        } else if (flungUp || landed < SNAP_HALF / 2) {
          snapTo(SNAP_FULL);
        } else if (landed < SNAP_HALF * 1.5) {
          snapTo(SNAP_HALF);
        } else {
          dismiss();
        }
      },
    }),
  ).current;

  if (!flight) return null;

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
          {/* Drag zone */}
          <View {...pan.panHandlers} style={s.dragZone}>
            <View style={s.handle} />

            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ letterSpacing: 1.2 }}>
                  CHOOSE YOUR FARE
                </Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  {flight.origin} → {flight.destination} · {flight.departTime} · {flight.duration}
                </Text>
              </View>
              <Pressable style={s.closeBtn} onPress={dismiss} hitSlop={8}>
                <Feather name="x" size={19} color={palette.gray600} />
              </Pressable>
            </View>

            {/* Airline strip */}
            <View style={s.airline}>
              <View style={[s.logo, { backgroundColor: flight.airlineColor }]}>
                <Text style={s.logoText}>{flight.airlineCode}</Text>
              </View>
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {flight.airline} · {flight.flightNumber}
              </Text>
              <View style={s.onTime}>
                <Feather name="trending-up" size={11} color={palette.success} />
                <Text variant="caption" style={{ color: palette.success }}>
                  88% on-time
                </Text>
              </View>
            </View>

            {/* Mode toggle */}
            <View style={s.toggle}>
              {(['cards', 'compare'] as ViewMode[]).map((m) => (
                <Pressable
                  key={m}
                  style={[s.toggleBtn, mode === m && s.toggleBtnOn]}
                  onPress={() => setMode(m)}
                >
                  <Feather
                    name={m === 'cards' ? 'layers' : 'columns'}
                    size={13}
                    color={mode === m ? palette.gray900 : palette.gray500}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: mode === m ? palette.gray900 : palette.gray500,
                      fontWeight: mode === m ? '600' : '400',
                    }}
                  >
                    {m === 'cards' ? 'Fares' : 'Compare'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={
              mode === 'cards'
                ? {
                    paddingHorizontal: HPAD,
                    paddingTop: spacing.md,
                    paddingBottom: 150 + insets.bottom,
                  }
                : { paddingTop: spacing.md, paddingBottom: 150 + insets.bottom }
            }
            showsVerticalScrollIndicator={false}
          >
            {mode === 'cards' ? (
              fares.map((fare, i) => (
                <FareCard
                  key={fare.id}
                  fare={fare}
                  prevFare={i > 0 ? fares[i - 1] : null}
                  cheapest={cheapest}
                  isRecommended={fare.id === recommendedId}
                  isSelected={fare.id === selectedId}
                  onSelect={() => setSelectedId(fare.id)}
                />
              ))
            ) : (
              <CompareTable
                fares={fares}
                cheapest={cheapest}
                selectedId={selectedId}
                recommendedId={recommendedId}
                onSelect={setSelectedId}
              />
            )}
          </ScrollView>

          {/* Sticky confirm */}
          <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={{ flex: 1 }}>
              {selectedFare ? (
                <>
                  <Text variant="caption" color="textTertiary">
                    {selectedFare.name} · {refundLabel(selectedFare.refundable)}
                  </Text>
                  <Text style={s.total}>₹{selectedFare.price.toLocaleString()}</Text>
                </>
              ) : (
                <Text variant="bodySmall" color="textTertiary">
                  Pick a fare to continue
                </Text>
              )}
            </View>
            <Pressable
              style={[s.confirm, !selectedFare && s.confirmOff]}
              disabled={!selectedFare}
              onPress={() => selectedFare && onConfirm(selectedFare)}
            >
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Continue
              </Text>
              <Feather name="arrow-right" size={17} color={palette.white} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    height: SHEET_H,
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.sheet,
  },
  dragZone: {
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: HPAD,
    marginBottom: spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
    marginBottom: spacing.md,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: palette.white, fontWeight: '700', fontSize: 12 },
  onTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: palette.gray100,
    borderRadius: radii.md,
    padding: 3,
    marginHorizontal: HPAD,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  toggleBtnOn: {
    backgroundColor: palette.white,
    ...shadows.card,
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
    paddingBottom: spacing.xl,
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  total: {
    fontSize: 21,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 26,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radii.full,
  },
  confirmOff: {
    backgroundColor: palette.gray300,
  },
});
