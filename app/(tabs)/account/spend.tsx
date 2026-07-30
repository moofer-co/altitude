import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { palette, spacing, radii } from '../../../constants/tokens';
import { useNow } from '../../../data/trip';
import {
  spendSummary,
  spendHistory,
  spendByYear,
  topRoutes,
  type SpendEntry,
} from '../../../data/account';

export default function SpendPage() {
  const now = useNow();
  const router = useRouter();
  const summary = useMemo(() => spendSummary(now), [now]);
  const entries = useMemo(() => spendHistory(), []);
  const byYear = useMemo(() => spendByYear(entries), [entries]);
  const routes = useMemo(() => topRoutes(), []);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered =
    yearFilter === 'all' ? entries : entries.filter((e) => e.year === yearFilter);
  const total =
    yearFilter === 'all'
      ? byYear.reduce((sum, y) => sum + y.total, 0)
      : byYear.find((y) => y.year === yearFilter)?.total ?? 0;

  return (
    <AccountSubpage
      title="Spend history"
      subtitle="Charges and refunds across your trips"
      scroll={false}
      contentStyle={{ paddingHorizontal: 0, flex: 1 }}
    >
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            label="All"
            on={yearFilter === 'all'}
            onPress={() => setYearFilter('all')}
          />
          {byYear.map((y) => (
            <Chip
              key={y.year}
              label={String(y.year)}
              on={yearFilter === y.year}
              onPress={() => setYearFilter(y.year)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.total}>
          <Text variant="caption" color="textTertiary">
            {yearFilter === 'all' ? 'All time' : String(yearFilter)}
          </Text>
          <Text style={s.amount}>₹{Math.max(0, total).toLocaleString()}</Text>
          <Text variant="caption" color="textTertiary">
            {filtered.length} payment{filtered.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={s.statRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{summary.flightsFlown}</Text>
            <Text variant="caption" color="textTertiary" align="center">
              Flights flown
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{summary.upcomingCount}</Text>
            <Text variant="caption" color="textTertiary" align="center">
              Upcoming
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>
              {summary.currency}
              {(summary.totalPaid / 1000).toFixed(1)}k
            </Text>
            <Text variant="caption" color="textTertiary" align="center">
              All time
            </Text>
          </View>
        </View>

        {routes.length > 0 && (
          <View style={s.routes}>
            <Text
              variant="caption"
              color="textTertiary"
              style={{ letterSpacing: 1, marginBottom: 6 }}
            >
              MOST TRAVELLED
            </Text>
            {routes.map((r) => (
              <View key={r.route} style={s.routeRow}>
                <Text variant="bodySmall" style={{ flex: 1 }}>
                  {r.route}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {r.count} {r.count > 1 ? 'trips' : 'trip'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Feather name="inbox" size={28} color={palette.gray400} />
            <Text variant="bodySmall" color="textTertiary" align="center">
              No payments in this period
            </Text>
          </View>
        )}

        {filtered.map((entry) => (
          <SpendRow
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
            onOpenTrip={(pnr) =>
              router.push({ pathname: '/itinerary', params: { pnr } })
            }
          />
        ))}
      </ScrollView>
    </AccountSubpage>
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.chip, on && s.chipOn]} onPress={onPress}>
      <Text
        variant="caption"
        style={{
          color: on ? palette.primary700 : palette.gray600,
          fontWeight: on ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SpendRow({
  entry,
  open,
  onToggle,
  onOpenTrip,
}: {
  entry: SpendEntry;
  open: boolean;
  onToggle: () => void;
  onOpenTrip: (pnr: string) => void;
}) {
  const isRefund = entry.amount < 0 || entry.status === 'refunded';
  return (
    <View style={s.spendCard}>
      <Pressable style={s.spendHead} onPress={onToggle}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{entry.label}</Text>
          <Text variant="caption" color="textTertiary">
            {entry.route} · {entry.pnr} · {entry.dateLabel}
          </Text>
        </View>
        <Text
          style={[
            s.spendAmt,
            isRefund && { color: palette.warningDark },
          ]}
        >
          {isRefund && entry.amount > 0 ? '−' : entry.amount < 0 ? '−' : ''}
          ₹{Math.abs(entry.amount).toLocaleString()}
        </Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.gray400}
        />
      </Pressable>
      {open && (
        <View style={s.spendBody}>
          <Text variant="caption" color="textTertiary">
            {entry.method}
            {entry.lines?.length
              ? ` · ${entry.lines.map((l) => l.label).join(', ')}`
              : ''}
          </Text>
          <Pressable onPress={() => onOpenTrip(entry.pnr)} hitSlop={6}>
            <Text
              variant="caption"
              style={{ color: palette.primary600, fontWeight: '600' }}
            >
              View trip
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: palette.white,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  chipOn: {
    borderColor: palette.primary400,
    backgroundColor: palette.primary50,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  total: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.gray900,
    marginVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: palette.gray900 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: palette.gray200,
  },
  routes: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  spendCard: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  spendHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
  },
  spendAmt: { fontSize: 15, fontWeight: '700', color: palette.gray900 },
  spendBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
    paddingTop: spacing.sm,
  },
});
