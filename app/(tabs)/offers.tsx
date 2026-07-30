import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../components/ui';
import { TabScreenEnter } from '../../components/TabScreenEnter';
import { OfferCard } from '../../components/OffersSheet';
import { layout, palette, spacing, radii } from '../../constants/tokens';
import {
  offersCatalog,
  offersByCategory,
  OFFER_CATEGORY_LABEL,
  type OfferCategory,
} from '../../data/offers';

const HPAD = layout.screenPadding;

type Filter = 'all' | OfferCategory;

/**
 * Dedicated Offers tab — browse bank, payment, airline and seasonal deals
 * outside an active booking. In-journey apply happens via OffersSheet.
 */
export default function Offers() {
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => offersByCategory(filter), [filter]);

  const chips: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'payment', label: OFFER_CATEGORY_LABEL.payment },
    { id: 'bank', label: OFFER_CATEGORY_LABEL.bank },
    { id: 'platform', label: OFFER_CATEGORY_LABEL.platform },
    { id: 'airline', label: OFFER_CATEGORY_LABEL.airline },
    { id: 'season', label: OFFER_CATEGORY_LABEL.season },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TabScreenEnter variant="offers" backgroundColor={palette.white}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text variant="h1">Offers</Text>
            <Text variant="caption" color="textTertiary">
              {offersCatalog.length} deals · apply at payment when you book
            </Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="tag" size={18} color={palette.primary600} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          style={s.chipsWrap}
        >
          {chips.map((c) => {
            const on = filter === c.id;
            return (
              <Pressable
                key={c.id}
                style={[s.chip, on && s.chipOn]}
                onPress={() => setFilter(c.id)}
              >
                <Text
                  variant="caption"
                  style={{
                    color: on ? palette.white : palette.gray700,
                    fontWeight: on ? '600' : '400',
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.banner}>
            <Feather name="info" size={14} color={palette.primary600} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Offers here are for browsing. During checkout, open payment and tap
              View all to apply one to your booking.
            </Text>
          </View>

          {list.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}

          {list.length === 0 && (
            <View style={s.empty}>
              <Feather name="tag" size={28} color={palette.gray300} />
              <Text variant="h2" align="center">
                No offers here
              </Text>
              <Text variant="bodySmall" color="textSecondary" align="center">
                Try another category or check back soon.
              </Text>
            </View>
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </TabScreenEnter>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: HPAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: { flexGrow: 0 },
  chips: {
    paddingHorizontal: HPAD,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: palette.gray100,
  },
  chipOn: { backgroundColor: palette.primary500 },
  list: {
    paddingHorizontal: HPAD,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.primary50,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
});
