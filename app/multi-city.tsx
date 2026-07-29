import { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Row } from '../components/ui';
import { AirportSearchSheet } from '../components/AirportSearchSheet';
import {
  DateSelectSheet,
} from '../components/DateSelectSheet';
import { formatShortDate } from '../components/DateSelectPicker';
import { palette, spacing, radii, shadows } from '../constants/tokens';
import { airports, allAirports } from '../data/airports';
import { getPreferences } from '../data/account';
import type { Airport } from '../types';

type Leg = {
  id: string;
  from: Airport | null;
  to: Airport | null;
  date: string | null;
};

const MAX_LEGS = 5;
const MIN_LEGS = 2;

function newId() {
  return `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveHome(): Airport {
  const prefs = getPreferences();
  return (
    airports.find((a) => a.iata === prefs.homeAirport) ??
    allAirports.find((a) => a.iata === prefs.homeAirport) ??
    airports.find((a) => a.iata === 'DEL') ??
    allAirports[0]
  );
}

function seedLegs(): Leg[] {
  const home = resolveHome();
  return [
    { id: newId(), from: home, to: null, date: null },
    { id: newId(), from: null, to: null, date: null },
  ];
}

function Field({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.field} onPress={onPress} accessibilityRole="button">
      <Text variant="caption" color="textTertiary" style={s.fieldLabel}>
        {label}
      </Text>
      <Text
        variant="h2"
        numberOfLines={1}
        style={[s.fieldValue, !value && s.fieldPlaceholder]}
      >
        {value ?? placeholder}
      </Text>
    </Pressable>
  );
}

export default function MultiCity() {
  const router = useRouter();
  const [legs, setLegs] = useState<Leg[]>(seedLegs);
  const [airportTarget, setAirportTarget] = useState<{
    legId: string;
    field: 'from' | 'to';
  } | null>(null);
  const [dateTarget, setDateTarget] = useState<string | null>(null);

  const canSearch = useMemo(
    () => legs.every((l) => l.from && l.to && l.date),
    [legs],
  );

  const activeAirport = useMemo(() => {
    if (!airportTarget) return undefined;
    const leg = legs.find((l) => l.id === airportTarget.legId);
    return leg?.[airportTarget.field]?.iata;
  }, [airportTarget, legs]);

  const activeDate = useMemo(() => {
    if (!dateTarget) return null;
    return legs.find((l) => l.id === dateTarget)?.date ?? null;
  }, [dateTarget, legs]);

  const minDateFor = useCallback(
    (legId: string) => {
      const idx = legs.findIndex((l) => l.id === legId);
      if (idx <= 0) return null;
      return legs[idx - 1]?.date ?? null;
    },
    [legs],
  );

  const updateLeg = useCallback((id: string, patch: Partial<Omit<Leg, 'id'>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLegs((prev) => {
      const next = prev.map((leg) =>
        leg.id === id ? { ...leg, ...patch } : leg,
      );
      if (patch.to) {
        const idx = next.findIndex((l) => l.id === id);
        if (idx >= 0 && idx < next.length - 1) {
          const following = next[idx + 1];
          const prevTo = prev[idx]?.to;
          if (
            !following.from ||
            (prevTo && following.from.iata === prevTo.iata)
          ) {
            next[idx + 1] = { ...following, from: patch.to };
          }
        }
      }
      return next;
    });
  }, []);

  const addCity = useCallback(() => {
    setLegs((prevLegs) => {
      if (prevLegs.length >= MAX_LEGS) return prevLegs;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const last = prevLegs[prevLegs.length - 1];
      return [
        ...prevLegs,
        {
          id: newId(),
          from: last?.to ?? null,
          to: null,
          date: null,
        },
      ];
    });
  }, []);

  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => {
      if (prev.length <= MIN_LEGS) return prev;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  const sheetTitle =
    airportTarget?.field === 'from'
      ? 'Where from?'
      : airportTarget?.field === 'to'
        ? 'Where to?'
        : 'Airport';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Row justify="space-between" style={s.header}>
        <View style={s.badge}>
          <Feather name="map" size={14} color={palette.primary600} />
          <Text variant="bodySmall" style={s.badgeLabel}>
            Multi-city
          </Text>
        </View>
        <Pressable
          style={s.closeBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
          }}
          hitSlop={6}
          accessibilityLabel="Close multi-city"
        >
          <Feather name="x" size={20} color={palette.gray600} />
        </Pressable>
      </Row>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          {legs.map((leg, index) => (
            <View key={leg.id}>
              {index > 0 && <View style={s.divider} />}
              <View style={s.legRow}>
                <Pressable
                  style={[
                    s.removeBtn,
                    legs.length <= MIN_LEGS && s.removeDisabled,
                  ]}
                  onPress={() => removeLeg(leg.id)}
                  disabled={legs.length <= MIN_LEGS}
                  hitSlop={6}
                  accessibilityLabel={`Remove flight ${index + 1}`}
                >
                  <Feather
                    name="x"
                    size={14}
                    color={
                      legs.length <= MIN_LEGS
                        ? palette.gray300
                        : palette.gray500
                    }
                  />
                </Pressable>

                <Field
                  label="FROM"
                  value={leg.from?.iata ?? null}
                  placeholder="—"
                  onPress={() =>
                    setAirportTarget({ legId: leg.id, field: 'from' })
                  }
                />
                <View style={s.vRule} />
                <Field
                  label="TO"
                  value={leg.to?.iata ?? null}
                  placeholder="—"
                  onPress={() =>
                    setAirportTarget({ legId: leg.id, field: 'to' })
                  }
                />
                <View style={s.vRule} />
                <Field
                  label="DATE"
                  value={leg.date ? formatShortDate(leg.date) : null}
                  placeholder="—"
                  onPress={() => setDateTarget(leg.id)}
                />
              </View>
            </View>
          ))}

          {legs.length < MAX_LEGS && (
            <>
              <View style={s.divider} />
              <Pressable
                style={s.addRow}
                onPress={addCity}
                accessibilityRole="button"
                accessibilityLabel="Add city"
              >
                <Feather name="plus" size={18} color={palette.primary600} />
                <Text variant="bodyMedium" style={s.addLabel}>
                  ADD CITY
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Text variant="caption" color="textTertiary" style={s.hint}>
          Each stop needs an airport and a date. Search opens flight results
          for the full itinerary.
        </Text>
      </ScrollView>

      <View style={s.footer}>
        <Button
          label="Search flight"
          onPress={() => router.push('/flights')}
          disabled={!canSearch}
          rounded
        />
      </View>

      <AirportSearchSheet
        visible={airportTarget != null}
        selectedIata={activeAirport}
        title={sheetTitle}
        subtitle="Same airport list as search"
        onClose={() => setAirportTarget(null)}
        onSelect={(airport) => {
          if (!airportTarget) return;
          const { legId, field } = airportTarget;
          updateLeg(legId, { [field]: airport });
          setAirportTarget(null);
          // After picking a city (TO), ask for the date with the full picker sheet
          if (field === 'to') {
            setTimeout(() => setDateTarget(legId), 280);
          }
        }}
      />

      <DateSelectSheet
        visible={dateTarget != null}
        title="Select date"
        selected={activeDate}
        minDate={dateTarget ? minDateFor(dateTarget) : null}
        confirmLabel="Continue"
        onClose={() => setDateTarget(null)}
        onSelect={(iso) => {
          if (!dateTarget) return;
          updateLeg(dateTarget, { date: iso });
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.primary100,
  },
  badgeLabel: {
    color: palette.primary700,
    fontWeight: '600',
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    ...shadows.card,
    overflow: 'hidden',
  },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    gap: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  removeDisabled: {
    backgroundColor: palette.gray50,
  },
  field: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    minWidth: 0,
  },
  fieldLabel: {
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.gray900,
  },
  fieldPlaceholder: {
    color: palette.gray300,
  },
  vRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: palette.gray200,
    marginVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginLeft: 44,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  addLabel: {
    color: palette.primary600,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hint: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    backgroundColor: palette.white,
  },
});
