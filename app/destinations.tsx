import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  TextInput,
  LayoutAnimation,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../components/ui';
import { PageEnter } from '../components/TabScreenEnter';
import { DestinationSheet } from '../components/DestinationSheet';
import { layout, palette, spacing, radii } from '../constants/tokens';
import { getPreferences } from '../data/account';
import {
  destinations,
  destinationsForTab,
  discountPercent,
  filterDestinations,
  type Destination,
  type DestinationTab,
} from '../data/destinations';

const { width: SW } = Dimensions.get('window');
const HPAD = layout.screenPadding;
const GRID_GAP = 12;
const CARD_W = (SW - HPAD * 2 - GRID_GAP) / 2;

const TABS: { id: DestinationTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weekend', label: 'Weekend escape' },
  { id: 'trending', label: 'Trending' },
  { id: 'nearby', label: 'Nearby' },
];

const TITLE: Record<DestinationTab, string> = {
  all: 'Good fares right now',
  weekend: 'Weekend escapes',
  trending: 'Trending',
  nearby: 'Nearby',
};

function parseTab(raw?: string | string[]): DestinationTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'weekend' || v === 'trending' || v === 'nearby' || v === 'all') return v;
  return 'all';
}

export default function DestinationsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<DestinationTab>(() => parseTab(params.tab));
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const inputRef = useRef<TextInput>(null);
  const originIata = getPreferences().homeAirport;

  // Anchor from home View all (and re-anchor when params change)
  useEffect(() => {
    setTab(parseTab(params.tab));
  }, [params.tab]);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const list = useMemo(() => {
    const base = destinationsForTab(tab, destinations);
    return filterDestinations(base, query);
  }, [tab, query]);

  const leftCol = useMemo(() => list.filter((_, i) => i % 2 === 0), [list]);
  const rightCol = useMemo(() => list.filter((_, i) => i % 2 === 1), [list]);

  const selectTab = useCallback((next: DestinationTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
    router.setParams({ tab: next });
  }, [router]);

  const openSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(true);
  };

  const closeSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PageEnter variant="destinations" backgroundColor={palette.gray50}>
        {/* Header */}
        <View style={s.header}>
          <Pressable
            style={s.iconBtn}
            onPress={() => {
              if (searchOpen) {
                closeSearch();
                return;
              }
              if (router.canGoBack()) router.back();
              else router.replace('/home');
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close search' : 'Go back'}
          >
            <Feather name={searchOpen ? 'x' : 'chevron-left'} size={22} color={palette.gray900} />
          </Pressable>

          {searchOpen ? (
            <View style={s.searchField}>
              <Feather name="search" size={16} color={palette.gray400} />
              <TextInput
                ref={inputRef}
                style={s.searchInput}
                placeholder="Search destinations"
                placeholderTextColor={palette.gray400}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCorrect={false}
                selectionColor={palette.primary500}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Feather name="x-circle" size={16} color={palette.gray400} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={s.titlePill}>
              <Text variant="bodySmall" numberOfLines={1} style={s.titleText}>
                {TITLE[tab]}
              </Text>
            </View>
          )}

          {!searchOpen ? (
            <Pressable
              style={s.iconBtnGhost}
              onPress={openSearch}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Search destinations"
            >
              <Feather name="search" size={20} color={palette.gray900} />
            </Pressable>
          ) : (
            <View style={s.iconBtnGhost} />
          )}
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
          style={s.tabsWrap}
        >
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={s.tab}
                onPress={() => selectTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: on ? palette.gray900 : palette.gray400,
                    fontWeight: on ? '700' : '500',
                  }}
                >
                  {t.label}
                </Text>
                <View style={[s.tabUnderline, on && s.tabUnderlineOn]} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Grid */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.gridPad}
          showsVerticalScrollIndicator={false}
        >
          {list.length === 0 ? (
            <View style={s.empty}>
              <Feather name="map" size={28} color={palette.gray400} />
              <Text variant="h2" align="center">
                No destinations
              </Text>
              <Text variant="bodySmall" color="textSecondary" align="center">
                {query
                  ? 'Try a different city or clear search'
                  : 'Nothing in this category right now'}
              </Text>
              {query.length > 0 && (
                <Pressable style={s.emptyBtn} onPress={() => setQuery('')}>
                  <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                    Clear search
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={s.columns}>
              <View style={s.col}>
                {leftCol.map((d, i) => (
                  <DestCard
                    key={d.id}
                    destination={d}
                    tall={i % 2 === 0}
                    onPress={() => setDestination(d)}
                  />
                ))}
              </View>
              <View style={s.col}>
                {rightCol.map((d, i) => (
                  <DestCard
                    key={d.id}
                    destination={d}
                    tall={i % 2 === 1}
                    onPress={() => setDestination(d)}
                  />
                ))}
              </View>
            </View>
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </PageEnter>

      <DestinationSheet
        destination={destination}
        originIata={originIata}
        visible={destination !== null}
        onClose={() => setDestination(null)}
        onFindFlights={() => {
          setDestination(null);
          router.push('/flights');
        }}
      />
    </SafeAreaView>
  );
}

function DestCard({
  destination: d,
  tall,
  onPress,
}: {
  destination: Destination;
  tall: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pct = discountPercent(d);

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      tension: 280,
      friction: 16,
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 220,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityLabel={`${d.city}, from ₹${d.fromPrice.toLocaleString()}`}
    >
      <Animated.View
        style={[
          s.card,
          { height: tall ? CARD_W * 1.45 : CARD_W * 1.18, transform: [{ scale }] },
        ]}
      >
        <Image source={{ uri: d.image }} style={s.cardImage} />
        <View style={s.cardScrim} />
        {pct > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{pct}% OFF</Text>
          </View>
        )}
        <View style={s.cardBody}>
          <Text style={s.city}>{d.city}</Text>
          <Text style={s.tagline} numberOfLines={2}>
            {d.tagline}
          </Text>
          <Text style={s.price}>₹ {d.fromPrice.toLocaleString()}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  titleText: {
    fontWeight: '600',
    color: palette.gray900,
  },
  searchField: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: palette.gray900,
    paddingVertical: 0,
  },

  tabsWrap: { flexGrow: 0 },
  tabs: {
    paddingHorizontal: HPAD,
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  tabUnderline: {
    marginTop: 8,
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineOn: {
    backgroundColor: palette.gray900,
  },

  gridPad: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.md,
  },
  columns: {
    flexDirection: 'row',
    gap: GRID_GAP,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    gap: GRID_GAP,
  },

  card: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: palette.gray200,
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  cardScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: palette.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.gray900,
    letterSpacing: 0.2,
  },
  cardBody: {
    padding: spacing.md,
    gap: 2,
  },
  city: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: palette.white,
  },
  tagline: {
    fontSize: 13,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.88)',
  },
  price: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: palette.white,
  },

  empty: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
