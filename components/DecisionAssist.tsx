import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { layout, palette, spacing, radii, shadows } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import type { Band } from '../lib/flightAnalysis';
import {
  PRIORITY_META,
  TIMING_OPTIONS,
  getAssistResult,
  type Priority,
} from '../lib/decisionAssist';

const { height: SH } = Dimensions.get('window');
const HPAD = layout.screenPadding;
const SHEET_H = SH * 0.82;
const DISMISS_AT = SHEET_H * 0.38;

// ═══════════════════════════════════════════════════════════
// Floating button
// ═══════════════════════════════════════════════════════════

export function AssistFab({
  visible,
  hint,
  onPress,
  onDismissHint,
}: {
  visible: boolean;
  hint: boolean;
  onPress: () => void;
  onDismissHint: () => void;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [visible, enter]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible) return null;

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        fab.wrap,
        {
          opacity: enter,
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          ],
        },
      ]}
    >
      {hint && (
        <Pressable style={fab.hint} onPress={onPress}>
          <Text variant="caption" style={{ color: palette.white }}>
            Not sure which to pick?
          </Text>
          <Pressable onPress={onDismissHint} hitSlop={10} style={fab.hintClose}>
            <Feather name="x" size={12} color={palette.gray400} />
          </Pressable>
        </Pressable>
      )}

      <View>
        <Animated.View
          pointerEvents="none"
          style={[
            fab.ring,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <Pressable style={fab.button} onPress={onPress}>
          <Feather name="compass" size={22} color={palette.white} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const fab = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: HPAD,
    bottom: 96,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gray900,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.floating,
  },
  hintClose: { padding: 2 },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.primary400,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});

// ═══════════════════════════════════════════════════════════
// Option row
// ═══════════════════════════════════════════════════════════

function OptionRow({
  icon,
  label,
  hint,
  selected,
  onPress,
}: {
  icon?: string;
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[opt.row, selected && opt.rowOn]} onPress={onPress}>
      {icon && (
        <View style={[opt.icon, selected && opt.iconOn]}>
          <Feather
            name={icon as never}
            size={16}
            color={selected ? palette.white : palette.gray600}
          />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      </View>
      <View style={[opt.radio, selected && opt.radioOn]}>
        {selected && <Feather name="check" size={13} color={palette.white} />}
      </View>
    </Pressable>
  );
}

const opt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: palette.white,
  },
  rowOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: palette.primary500 },
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
});

// ═══════════════════════════════════════════════════════════
// Sheet
// ═══════════════════════════════════════════════════════════

type Step = 'priority' | 'timing' | 'result';

export function AssistSheet({
  flights,
  visible,
  onClose,
  onApply,
  onSelectFlight,
}: {
  flights: MockFlight[];
  visible: boolean;
  onClose: () => void;
  onApply: (priority: Priority, timing: Band | 'any') => void;
  onSelectFlight: (flight: MockFlight) => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('priority');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [timing, setTiming] = useState<Band | 'any'>('any');

  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    if (visible) {
      setStep('priority');
      setPriority(null);
      setTiming('any');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
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
        Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_AT || g.vy > 0.8) dismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
      },
    }),
  ).current;

  const result = useMemo(
    () => (priority ? getAssistResult(flights, priority, timing) : null),
    [flights, priority, timing],
  );

  const title =
    step === 'priority'
      ? 'What matters most?'
      : step === 'timing'
        ? 'When would you rather fly?'
        : 'Here is what fits';

  const subtitle =
    step === 'priority'
      ? 'One tap and I will narrow these down for you'
      : step === 'timing'
        ? 'Skip this if you are flexible'
        : `Based on ${PRIORITY_META[priority!].label.toLowerCase()}`;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={sh.overlay}>
        <Pressable style={sh.backdrop} onPress={dismiss} />

        <Animated.View
          style={[
            sh.sheet,
            { height: SHEET_H + insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <View {...pan.panHandlers} style={sh.drag}>
            <View style={sh.handle} />
            <View style={sh.header}>
              <View style={{ flex: 1 }}>
                <View style={sh.titleRow}>
                  <View style={sh.badge}>
                    <Feather name="compass" size={12} color={palette.primary600} />
                  </View>
                  <Text variant="h2">{title}</Text>
                </View>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 3 }}>
                  {subtitle}
                </Text>
              </View>
              <Pressable style={sh.close} onPress={dismiss} hitSlop={8}>
                <Feather name="x" size={19} color={palette.gray600} />
              </Pressable>
            </View>

            {/* Progress */}
            <View style={sh.progress}>
              {(['priority', 'timing', 'result'] as Step[]).map((s) => (
                <View
                  key={s}
                  style={[
                    sh.progressDot,
                    (s === step ||
                      (step === 'timing' && s === 'priority') ||
                      (step === 'result' && s !== 'result')) &&
                      sh.progressDotOn,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={sh.body}
            showsVerticalScrollIndicator={false}
          >
            {step === 'priority' && (
              <>
                {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                  <OptionRow
                    key={p}
                    icon={PRIORITY_META[p].icon}
                    label={PRIORITY_META[p].label}
                    hint={PRIORITY_META[p].blurb}
                    selected={priority === p}
                    onPress={() => {
                      setPriority(p);
                      setStep('timing');
                    }}
                  />
                ))}
              </>
            )}

            {step === 'timing' && (
              <>
                {TIMING_OPTIONS.map((t) => (
                  <OptionRow
                    key={t.value}
                    label={t.label}
                    hint={t.hint}
                    selected={timing === t.value}
                    onPress={() => {
                      setTiming(t.value);
                      setStep('result');
                    }}
                  />
                ))}
              </>
            )}

            {step === 'result' && result && (
              <>
                {result.relaxedTiming && (
                  <View style={sh.notice}>
                    <Feather name="info" size={13} color={palette.warningDark} />
                    <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
                      Nothing departs in that window, so these cover the whole day.
                    </Text>
                  </View>
                )}

                {/* Hero */}
                <View style={sh.hero}>
                  <View style={sh.heroTag}>
                    <Feather name="check-circle" size={12} color={palette.white} />
                    <Text style={sh.heroTagText}>PICK FOR YOU</Text>
                  </View>

                  <View style={sh.heroTop}>
                    <View
                      style={[sh.logo, { backgroundColor: result.hero.airlineColor }]}
                    >
                      <Text style={sh.logoText}>{result.hero.airlineCode}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">{result.hero.airline}</Text>
                      <Text variant="caption" color="textTertiary">
                        {result.hero.flightNumber}
                      </Text>
                    </View>
                    <Text style={sh.heroPrice}>
                      ₹{result.hero.price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={sh.heroTimes}>
                    <Text style={sh.heroTime}>{result.hero.departTime}</Text>
                    <View style={sh.heroDash} />
                    <Text variant="caption" color="textTertiary">
                      {result.hero.duration}
                    </Text>
                    <View style={sh.heroDash} />
                    <Text style={sh.heroTime}>{result.hero.arriveTime}</Text>
                  </View>

                  <Text variant="bodySmall" style={sh.heroReason}>
                    {result.heroReason}
                  </Text>

                  <View style={sh.chips}>
                    {result.heroHighlights.map((h) => (
                      <View key={h} style={sh.chip}>
                        <Text style={sh.chipText}>{h}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={sh.heroBtn}
                    onPress={() => onSelectFlight(result.hero)}
                  >
                    <Text
                      variant="bodySmall"
                      style={{ color: palette.white, fontWeight: '600' }}
                    >
                      See fares for this flight
                    </Text>
                    <Feather name="arrow-right" size={16} color={palette.white} />
                  </Pressable>
                </View>

                {/* Alternatives */}
                {result.alternatives.length > 0 && (
                  <>
                    <Text variant="caption" color="textTertiary" style={sh.altLabel}>
                      IF YOU WANT TO WEIGH IT UP
                    </Text>
                    {result.alternatives.map(({ flight, note }) => (
                      <Pressable
                        key={flight.id}
                        style={sh.alt}
                        onPress={() => onSelectFlight(flight)}
                      >
                        <View
                          style={[sh.altLogo, { backgroundColor: flight.airlineColor }]}
                        >
                          <Text style={sh.altLogoText}>{flight.airlineCode}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodySmall">
                            {flight.departTime} · {flight.duration}
                            {flight.stops > 0 ? ` · ${flight.stops} stop` : ' · Direct'}
                          </Text>
                          <Text variant="caption" color="textTertiary">
                            {note}
                          </Text>
                        </View>
                        <Text variant="bodyMedium">
                          ₹{flight.price.toLocaleString()}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}

                <Pressable style={sh.redo} onPress={() => setStep('priority')}>
                  <Feather name="rotate-ccw" size={13} color={palette.gray600} />
                  <Text variant="caption" color="textSecondary">
                    Answer again
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          {step === 'result' && result && (
            <View style={[sh.footer, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="textTertiary">
                  {result.matchedCount} flights ranked
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {PRIORITY_META[priority!].label} first
                </Text>
              </View>
              <Pressable
                style={sh.apply}
                onPress={() => onApply(priority!, timing)}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: palette.white, fontWeight: '600' }}
                >
                  Reorder results
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sh = StyleSheet.create({
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
  drag: {
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
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.gray200,
  },
  progressDotOn: { backgroundColor: palette.primary500 },
  body: { paddingHorizontal: HPAD, paddingTop: spacing.md, paddingBottom: 150 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.warningLight,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },

  hero: {
    borderWidth: 2,
    borderColor: palette.primary500,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: palette.primary50,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  heroTagText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: palette.white, fontWeight: '700', fontSize: 12 },
  heroPrice: { fontSize: 20, fontWeight: '700', color: palette.gray900 },
  heroTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroTime: { fontSize: 17, fontWeight: '700', color: palette.gray900 },
  heroDash: {
    flex: 1,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.primary300,
  },
  heroReason: { marginTop: spacing.md, color: palette.gray700 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: spacing.sm },
  chip: {
    backgroundColor: palette.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  chipText: { fontSize: 12, color: palette.primary700, fontWeight: '500' },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.primary500,
    paddingVertical: 12,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },

  altLabel: {
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  alt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  altLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altLogoText: { color: palette.white, fontWeight: '700', fontSize: 12 },

  redo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
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
  apply: {
    backgroundColor: palette.primary500,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 13,
    borderRadius: radii.full,
  },
});
