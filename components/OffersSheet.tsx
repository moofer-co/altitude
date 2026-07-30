import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  offersCatalog,
  offersByCategory,
  OFFER_CATEGORY_LABEL,
  type Offer,
  type OfferCategory,
} from '../data/offers';
import type { PayMethod } from '../data/booking';

const HPAD = layout.screenPadding;

type Filter = 'all' | OfferCategory | 'applicable';

/**
 * In-journey offers browser (from payment sheet).
 * Full catalogue lives on the Offers tab.
 */
export function OffersSheet({
  visible,
  onClose,
  method,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  /** When set, “For this payment” filter is available */
  method?: PayMethod | null;
  selectedId?: string | null;
  onSelect?: (offer: Offer | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>(method ? 'applicable' : 'all');

  const list = useMemo(() => {
    if (filter === 'applicable' && method) {
      return offersCatalog.filter((o) => o.methods.includes(method));
    }
    if (filter === 'all' || filter === 'applicable') return offersCatalog;
    return offersByCategory(filter);
  }, [filter, method]);

  const chips: Array<{ id: Filter; label: string }> = [
    ...(method ? [{ id: 'applicable' as const, label: 'For this pay' }] : []),
    { id: 'all', label: 'All' },
    { id: 'payment', label: 'Payment' },
    { id: 'bank', label: 'Bank' },
    { id: 'platform', label: 'Altitude' },
    { id: 'airline', label: 'Airline' },
    { id: 'season', label: 'Seasonal' },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Offers"
      subtitle="Apply one at payment · browse more anytime in Offers"
      heightRatio={0.88}
    >
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
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={s.empty}>
            <Feather name="tag" size={28} color={palette.gray300} />
            <Text variant="bodySmall" color="textSecondary" align="center">
              No offers in this filter right now.
            </Text>
          </View>
        ) : (
          list.map((offer) => {
            const selected = selectedId === offer.id;
            const applicable = method ? offer.methods.includes(method) : true;
            return (
              <OfferCard
                key={offer.id}
                offer={offer}
                selected={selected}
                actionable={!!onSelect && applicable && offer.methods.length > 0}
                onPress={
                  onSelect && applicable && offer.methods.length > 0
                    ? () => onSelect(selected ? null : offer)
                    : undefined
                }
              />
            );
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Sheet>
  );
}

export function OfferCard({
  offer,
  selected,
  actionable,
  onPress,
}: {
  offer: Offer;
  selected?: boolean;
  actionable?: boolean;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      style={[s.card, selected && s.cardOn]}
      onPress={onPress}
    >
      <View style={s.badge}>
        <Text style={s.badgeText}>{offer.badge}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={2}>
          {offer.title}
        </Text>
        <Text variant="caption" color="textTertiary" numberOfLines={2}>
          {offer.note}
          {offer.hint ? ` · ${offer.hint}` : ''}
        </Text>
        <View style={s.meta}>
          <Text variant="caption" color="textTertiary">
            {OFFER_CATEGORY_LABEL[offer.category]}
            {offer.expires ? ` · till ${offer.expires}` : ''}
            {offer.code ? ` · ${offer.code}` : ''}
          </Text>
        </View>
      </View>
      {actionable && (
        <View style={[s.radio, selected && s.radioOn]}>
          {selected && <Feather name="check" size={13} color={palette.white} />}
        </View>
      )}
    </Wrapper>
  );
}

const s = StyleSheet.create({
  chipsWrap: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.gray200 },
  chips: {
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: palette.gray100,
  },
  chipOn: { backgroundColor: palette.primary500 },
  body: { paddingHorizontal: HPAD, paddingTop: spacing.md, gap: spacing.sm },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
  },
  cardOn: {
    borderColor: palette.primary400,
    backgroundColor: palette.primary50,
  },
  badge: {
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: palette.warningLight,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.warningDark,
  },
  meta: { marginTop: 4 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },
});
