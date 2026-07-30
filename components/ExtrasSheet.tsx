import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  meals,
  baggage,
  assistance,
  ASSIST_NOTICE_HOURS,
  passengerName,
  type Passenger,
} from '../data/booking';

export type ExtraKind = 'meal' | 'baggage' | 'assistance';

const CONFIG: Record<
  ExtraKind,
  { title: string; subtitle: string; multi: boolean }
> = {
  meal: {
    title: 'Meals',
    subtitle: 'Pre-ordered meals cost less than buying on board',
    multi: false,
  },
  baggage: {
    title: 'Extra baggage',
    subtitle: 'Cheaper now than at the airport counter',
    multi: false,
  },
  assistance: {
    title: 'Special assistance',
    subtitle: 'Free of charge, arranged with the airline',
    multi: true,
  },
};

export function ExtrasSheet({
  kind,
  visible,
  passengers,
  onClose,
  onApply,
}: {
  kind: ExtraKind;
  visible: boolean;
  passengers: Passenger[];
  onClose: () => void;
  onApply: (next: Passenger[]) => void;
}) {
  const [draft, setDraft] = useState<Passenger[]>(passengers);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (visible) {
      setDraft(passengers);
      setActive(0);
    }
  }, [visible, passengers]);

  const config = CONFIG[kind];
  const current = draft[active];

  if (!current) {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title={config.title}
        subtitle="Add a passenger first"
        heightRatio={0.4}
      >
        <View style={s.empty}>
          <Feather name="users" size={26} color={palette.gray300} />
          <Text variant="bodySmall" color="textSecondary" align="center">
            These options are chosen per passenger.
          </Text>
        </View>
      </Sheet>
    );
  }

  const update = (patch: Partial<Passenger>) =>
    setDraft((d) => d.map((p, i) => (i === active ? { ...p, ...patch } : p)));

  const toggleAssist = (id: string) =>
    update({
      assistance: current.assistance.includes(id)
        ? current.assistance.filter((x) => x !== id)
        : [...current.assistance, id],
    });

  const options =
    kind === 'meal' ? meals : kind === 'baggage' ? baggage : assistance;

  // Assistance is grouped; the other two are a flat list
  const groups =
    kind === 'assistance'
      ? [...new Set(assistance.map((a) => a.group))]
      : [null];

  const chosenCount = draft.reduce((n, p) => {
    if (kind === 'meal') return n + (p.mealId && p.mealId !== 'none' ? 1 : 0);
    if (kind === 'baggage')
      return n + (p.baggageId && p.baggageId !== 'included' ? 1 : 0);
    return n + (p.assistance.length > 0 ? 1 : 0);
  }, 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={config.title}
      subtitle={config.subtitle}
      heightRatio={0.86}
      headerAccessory={
        draft.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabs}
          >
            {draft.map((p, i) => {
              const on = i === active;
              const has =
                kind === 'meal'
                  ? p.mealId && p.mealId !== 'none'
                  : kind === 'baggage'
                    ? p.baggageId && p.baggageId !== 'included'
                    : p.assistance.length > 0;

              return (
                <Pressable
                  key={p.id}
                  style={[s.tab, on && s.tabOn]}
                  onPress={() => setActive(i)}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: on ? palette.white : palette.gray700,
                      fontWeight: on ? '600' : '400',
                    }}
                    numberOfLines={1}
                  >
                    {p.firstName || `Passenger ${i + 1}`}
                  </Text>
                  {has && (
                    <View
                      style={[s.dot, { backgroundColor: on ? palette.white : palette.success }]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null
      }
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textTertiary">
              {chosenCount === 0
                ? 'Nothing selected'
                : `Chosen for ${chosenCount} of ${draft.length}`}
            </Text>
            {kind !== 'assistance' && (
              <Text variant="bodyMedium">
                ₹{extrasTotal(draft, kind).toLocaleString()}
              </Text>
            )}
          </View>
          <Pressable style={s.done} onPress={() => onApply(draft)}>
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Done
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {draft.length > 1 && (
          <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
            Choosing for {passengerName(current)}
          </Text>
        )}

        {kind === 'assistance' && (
          <View style={s.notice}>
            <Feather name="clock" size={14} color={palette.infoDark} />
            <Text variant="caption" style={{ color: palette.infoDark, flex: 1 }}>
              Request at least {ASSIST_NOTICE_HOURS} hours before departure so the
              airport can arrange staff.
            </Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group ?? 'all'}>
            {group && (
              <Text variant="label" color="textTertiary" style={s.group}>
                {group.toUpperCase()}
              </Text>
            )}

            {options
              .filter((o) => (group ? (o as { group: string }).group === group : true))
              .map((o) => {
                const priced = 'price' in o ? (o as { price: number }).price : null;
                const selected =
                  kind === 'meal'
                    ? current.mealId === o.id ||
                      (!current.mealId && o.id === 'none')
                    : kind === 'baggage'
                      ? current.baggageId === o.id ||
                        (!current.baggageId && o.id === 'included')
                      : current.assistance.includes(o.id);

                return (
                  <Pressable
                    key={o.id}
                    style={[s.option, selected && s.optionOn]}
                    onPress={() => {
                      if (kind === 'meal') update({ mealId: o.id });
                      else if (kind === 'baggage') update({ baggageId: o.id });
                      else toggleAssist(o.id);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">{o.name}</Text>
                      <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                        {o.note}
                      </Text>
                    </View>

                    {priced !== null && (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: priced === 0 ? palette.success : palette.gray900,
                          fontWeight: '600',
                        }}
                      >
                        {priced === 0 ? 'Included' : `₹${priced.toLocaleString()}`}
                      </Text>
                    )}

                    <View
                      style={[
                        config.multi ? s.check : s.radio,
                        selected && (config.multi ? s.checkOn : s.radioOn),
                      ]}
                    >
                      {selected && <Feather name="check" size={13} color={palette.white} />}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function extrasTotal(list: Passenger[], kind: ExtraKind): number {
  return list.reduce((sum, p) => {
    if (kind === 'meal') {
      return sum + (meals.find((m) => m.id === p.mealId)?.price ?? 0);
    }
    if (kind === 'baggage') {
      return sum + (baggage.find((b) => b.id === p.baggageId)?.price ?? 0);
    }
    return sum;
  }, 0);
}

const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    maxWidth: 160,
  },
  tabOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.infoLight,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },

  group: { letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.sm },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  optionOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },

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
  check: {
    width: 22,
    height: 22,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  done: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
