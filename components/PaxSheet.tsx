import { useState, useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import {
  validatePax,
  seatsNeeded,
  totalTravellers,
  type PaxMix,
} from '../lib/flightRules';

const ROWS: Array<{
  key: keyof PaxMix;
  label: string;
  hint: string;
  icon: string;
}> = [
  { key: 'adults', label: 'Adults', hint: '12 years and over', icon: 'user' },
  { key: 'children', label: 'Children', hint: '2 to 11 years · own seat', icon: 'users' },
  { key: 'infants', label: 'Infants', hint: 'Under 2 · travels on a lap', icon: 'heart' },
];

export function PaxSheet({
  visible,
  pax,
  onClose,
  onApply,
}: {
  visible: boolean;
  pax: PaxMix;
  onClose: () => void;
  onApply: (next: PaxMix) => void;
}) {
  const [draft, setDraft] = useState<PaxMix>(pax);

  useEffect(() => {
    if (visible) setDraft(pax);
  }, [visible, pax]);

  const error = validatePax(draft);
  const seats = seatsNeeded(draft);
  const applyScale = useRef(new Animated.Value(1)).current;

  const pressApplyIn = () => {
    if (error) return;
    Animated.spring(applyScale, {
      toValue: 0.96,
      tension: 280,
      friction: 16,
      useNativeDriver: true,
    }).start();
  };

  const pressApplyOut = () => {
    Animated.spring(applyScale, {
      toValue: 1,
      tension: 220,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const step = (key: keyof PaxMix, delta: number) => {
    setDraft((d) => {
      const next = { ...d, [key]: Math.max(0, d[key] + delta) };
      // Keep the party legal as it is edited rather than only at the end
      if (key === 'adults' && next.infants > next.adults) {
        next.infants = next.adults;
      }
      return next;
    });
  };

  const canIncrease = (key: keyof PaxMix) => {
    if (key === 'infants') return draft.infants < draft.adults;
    return seats < 9;
  };

  const canDecrease = (key: keyof PaxMix) =>
    key === 'adults' ? draft.adults > 1 : draft[key] > 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Who is travelling?"
      subtitle="Fares and seat availability depend on the mix"
      heightRatio={0.72}
      footer={
        <Pressable
          onPress={() => !error && onApply(draft)}
          onPressIn={pressApplyIn}
          onPressOut={pressApplyOut}
          disabled={!!error}
        >
          <Animated.View
            style={[
              s.apply,
              error && s.applyOff,
              { transform: [{ scale: applyScale }] },
            ]}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {error ??
                `Search for ${totalTravellers(draft)} traveller${totalTravellers(draft) > 1 ? 's' : ''}`}
            </Text>
          </Animated.View>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {ROWS.map((row) => {
          const value = draft[row.key];
          const up = canIncrease(row.key);
          const down = canDecrease(row.key);

          return (
            <View key={row.key} style={s.row}>
              <View style={s.icon}>
                <Feather name={row.icon as never} size={17} color={palette.gray600} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{row.label}</Text>
                <Text variant="caption" color="textTertiary">
                  {row.hint}
                </Text>
              </View>

              <View style={s.stepper}>
                <Pressable
                  style={[s.step, !down && s.stepOff]}
                  onPress={() => down && step(row.key, -1)}
                  disabled={!down}
                  hitSlop={4}
                >
                  <Feather
                    name="minus"
                    size={17}
                    color={down ? palette.gray900 : palette.gray300}
                  />
                </Pressable>

                <Text variant="bodyMedium" style={s.count}>
                  {value}
                </Text>

                <Pressable
                  style={[s.step, !up && s.stepOff]}
                  onPress={() => up && step(row.key, 1)}
                  disabled={!up}
                  hitSlop={4}
                >
                  <Feather
                    name="plus"
                    size={17}
                    color={up ? palette.gray900 : palette.gray300}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={s.summary}>
          <View style={s.summaryLine}>
            <Feather name="airplay" size={14} color={palette.gray500} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {seats} seat{seats > 1 ? 's' : ''} needed
              {draft.infants > 0 &&
                ` · ${draft.infants} infant${draft.infants > 1 ? 's' : ''} on laps`}
            </Text>
          </View>

          {draft.children > 0 && (
            <View style={s.summaryLine}>
              <Feather name="percent" size={14} color={palette.success} />
              <Text variant="caption" style={{ color: palette.successDark, flex: 1 }}>
                Child fares are discounted. Airlines verify age at check-in, so a
                date of birth is required at booking.
              </Text>
            </View>
          )}

          {draft.infants > 0 && (
            <View style={s.summaryLine}>
              <Feather name="info" size={14} color={palette.infoDark} />
              <Text variant="caption" style={{ color: palette.infoDark, flex: 1 }}>
                Infants pay a flat fare on domestic routes and a share of the adult
                fare internationally.
              </Text>
            </View>
          )}

          {error && (
            <View style={s.summaryLine}>
              <Feather name="alert-circle" size={14} color={palette.error} />
              <Text variant="caption" style={{ color: palette.error, flex: 1 }}>
                {error}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    minHeight: 72,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: { borderColor: palette.gray100 },
  count: { minWidth: 24, textAlign: 'center' },

  summary: { gap: spacing.sm, marginTop: spacing.lg },
  summaryLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },

  apply: {
    minHeight: 52,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyOff: { backgroundColor: palette.gray400 },
});
