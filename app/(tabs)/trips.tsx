import { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Plane } from '../../components/ui';
import { TabScreenEnter } from '../../components/TabScreenEnter';
import { layout, palette, spacing, radii, shadows } from '../../constants/tokens';
import {
  allTrips,
  groupTrips,
  nextAction,
  routeString,
  tripsNeedingAttention,
  type NextAction,
} from '../../data/trips';
import {
  tripStatus,
  STATUS_META,
  timeOf,
  dateOf,
  countdownTo,
  useNow,
  type Trip,
} from '../../data/trip';

const HPAD = layout.screenPadding;

const URGENCY = {
  now: { bg: palette.primary500, fg: palette.white, sub: 'rgba(255,255,255,0.85)' },
  soon: { bg: palette.warningLight, fg: palette.warningDark, sub: palette.warningDark },
  calm: { bg: palette.white, fg: palette.gray900, sub: palette.gray500 },
} as const;

const TONE = {
  neutral: { bg: palette.gray100, fg: palette.gray700, dot: palette.gray500 },
  good: { bg: palette.successLight, fg: palette.successDark, dot: palette.success },
  warn: { bg: palette.warningLight, fg: palette.warningDark, dot: palette.warning },
  bad: { bg: palette.errorLight, fg: palette.errorDark, dot: palette.error },
} as const;

export default function Trips() {
  const now = useNow();
  const router = useRouter();

  const groups = useMemo(() => groupTrips(allTrips, now), [now]);
  const attention = useMemo(() => tripsNeedingAttention(allTrips, now), [now]);

  // The assistance layer: the most urgent action across every trip
  const spotlight = useMemo(() => {
    const ranked = allTrips
      .map((t) => ({ trip: t, action: nextAction(t, now) }))
      .filter((x) => x.action.urgency !== 'calm')
      .sort((a, b) => rank(a.action) - rank(b.action));
    return ranked[0] ?? null;
  }, [now]);

  const goTo = (trip: Trip, _action: NextAction) => {
    router.push({ pathname: '/itinerary', params: { pnr: trip.pnr } });
  };

  const empty =
    groups.active.length === 0 &&
    groups.upcoming.length === 0 &&
    groups.past.length === 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TabScreenEnter variant="trips" backgroundColor={palette.gray50}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Trips</Text>
          <Text variant="caption" color="textTertiary">
            {attention > 0
              ? `${attention} need${attention > 1 ? '' : 's'} your attention`
              : 'Everything is on track'}
          </Text>
        </View>
        <Pressable
          style={s.searchBtn}
          onPress={() => router.push('/airport-search')}
          hitSlop={6}
        >
          <Feather name="plus" size={20} color={palette.gray900} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {empty ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Plane size={28} color={palette.gray400} />
            </View>
            <Text variant="h2" align="center">
              No trips yet
            </Text>
            <Text variant="bodySmall" color="textSecondary" align="center">
              When you book a flight it will appear here, along with everything you
              need to do before you fly.
            </Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push('/home')}>
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Find a flight
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Assistance ── */}
            {spotlight && (
              <Spotlight
                trip={spotlight.trip}
                action={spotlight.action}
                now={now}
                onPress={() => goTo(spotlight.trip, spotlight.action)}
              />
            )}

            {/* ── Active ── */}
            {groups.active.length > 0 && (
              <>
                <SectionLabel text="Happening now" />
                {groups.active.map((t) => (
                  <TripCard key={t.pnr} trip={t} now={now} onPress={() => goTo(t, nextAction(t, now))} />
                ))}
              </>
            )}

            {/* ── Upcoming ── */}
            {groups.upcoming.length > 0 && (
              <>
                <SectionLabel text="Upcoming" />
                {groups.upcoming.map((t) => (
                  <TripCard key={t.pnr} trip={t} now={now} onPress={() => goTo(t, nextAction(t, now))} />
                ))}
              </>
            )}

            {/* ── Past ── */}
            {groups.past.length > 0 && (
              <>
                <SectionLabel text="Past" />
                {groups.past.map((t) => (
                  <TripCard key={t.pnr} trip={t} now={now} past onPress={() => goTo(t, nextAction(t, now))} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
      </TabScreenEnter>
    </SafeAreaView>
  );
}

// ─── Assistance spotlight ────────────────────────────────

function Spotlight({
  trip,
  action,
  now,
  onPress,
}: {
  trip: Trip;
  action: NextAction;
  now: number;
  onPress: () => void;
}) {
  const tone = URGENCY[action.urgency];
  const loud = action.urgency === 'now';

  return (
    <Pressable style={[s.spot, { backgroundColor: tone.bg }, loud && shadows.card]} onPress={onPress}>
      <View style={s.spotTop}>
        <Text
          variant="caption"
          style={{ color: tone.sub, fontWeight: '700', letterSpacing: 0.8 }}
        >
          NEXT FOR YOU
        </Text>
        <View style={[s.spotRoute, loud && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text variant="caption" style={{ color: tone.sub, fontWeight: '600' }}>
            {routeString(trip)}
          </Text>
        </View>
      </View>

      <View style={s.spotBody}>
        <View
          style={[
            s.spotIcon,
            { backgroundColor: loud ? 'rgba(255,255,255,0.18)' : palette.primary50 },
          ]}
        >
          <Feather
            name={action.icon as never}
            size={22}
            color={loud ? palette.white : palette.primary600}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            variant="h2"
            style={{ color: tone.fg }}
          >
            {action.label}
          </Text>
          <Text variant="bodySmall" style={{ color: tone.sub }}>
            {action.detail}
          </Text>
        </View>
        <Feather name="arrow-right" size={22} color={tone.fg} />
      </View>
    </Pressable>
  );
}

// ─── Trip card ───────────────────────────────────────────

function TripCard({
  trip,
  now,
  past,
  onPress,
}: {
  trip: Trip;
  now: number;
  past?: boolean;
  onPress: () => void;
}) {
  const status = tripStatus(trip, now);
  const meta = STATUS_META[status];
  const tone = TONE[meta.tone];
  const seg = trip.segments[0];
  const last = trip.segments[trip.segments.length - 1];
  const action = nextAction(trip, now);
  const toDepart = countdownTo(seg.departISO, now);

  return (
    <Pressable style={[s.card, past && s.cardPast]} onPress={onPress}>
      {/* Header row */}
      <View style={s.cardHead}>
        <View style={[s.carrierMark, { backgroundColor: seg.carrierColor }]}>
          <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
            {seg.marketingCode}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">
            {seg.originCity} to {last.destinationCity}
          </Text>
          <Text variant="caption" color="textTertiary">
            {dateOf(seg.departISO)} · {trip.pnr}
          </Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: tone.bg }]}>
          <View style={[s.statusDot, { backgroundColor: tone.dot }]} />
          <Text variant="caption" style={{ color: tone.fg, fontWeight: '600' }}>
            {meta.label}
          </Text>
        </View>
      </View>

      {/* Route line */}
      <View style={s.routeLine}>
        <View style={s.routeEnd}>
          <Text style={s.routeTime}>{timeOf(seg.departISO)}</Text>
          <Text variant="caption" color="textTertiary">
            {seg.origin}
          </Text>
        </View>

        <View style={s.routeMid}>
          <View style={s.routeDot} />
          <View style={s.routeDash} />
          <Plane size={13} color={palette.gray500} />
          <View style={s.routeDash} />
          <View style={[s.routeDot, s.routeDotFilled]} />
        </View>

        <View style={[s.routeEnd, { alignItems: 'flex-end' }]}>
          <Text style={s.routeTime}>{timeOf(last.arriveISO)}</Text>
          <Text variant="caption" color="textTertiary">
            {last.destination}
          </Text>
        </View>
      </View>

      {/* Next action footer — the assistance, per card */}
      {!past && (
        <View style={s.cardFoot}>
          <Feather
            name={action.icon as never}
            size={14}
            color={action.urgency === 'now' ? palette.primary600 : palette.gray600}
          />
          <Text
            variant="caption"
            style={{
              flex: 1,
              color: action.urgency === 'now' ? palette.primary700 : palette.gray600,
              fontWeight: action.urgency === 'now' ? '600' : '400',
            }}
          >
            {action.label} · {action.detail}
          </Text>
          <Feather name="chevron-right" size={16} color={palette.gray400} />
        </View>
      )}

      {past && (
        <View style={s.cardFoot}>
          <Feather name="download" size={14} color={palette.gray600} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            View receipt and boarding passes
          </Text>
          <Feather name="chevron-right" size={16} color={palette.gray400} />
        </View>
      )}
    </Pressable>
  );
}

// ─── Pieces ──────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text variant="label" color="textTertiary" style={s.sectionLabel}>
      {text.toUpperCase()}
    </Text>
  );
}

function rank(a: NextAction): number {
  if (a.urgency === 'now') return 0;
  if (a.urgency === 'soon') return 1;
  return 2;
}

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: HPAD },

  // Spotlight
  spot: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  spotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  spotRoute: {
    backgroundColor: palette.gray50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  spotBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionLabel: { letterSpacing: 1, marginTop: spacing.sm, marginBottom: spacing.sm },

  // Card
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardPast: { opacity: 0.8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  carrierMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  routeEnd: { minWidth: 56 },
  routeTime: { fontSize: 18, fontWeight: '700', color: palette.gray900, lineHeight: 23 },
  routeMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md },
  routeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.gray300 },
  routeDotFilled: { backgroundColor: palette.gray400 },
  routeDash: {
    flex: 1,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
  },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.sm },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyBtn: {
    backgroundColor: palette.primary500,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.full,
    marginTop: spacing.lg,
  },
});
