import { useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  LayoutAnimation,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../components/ui';
import { palette, spacing, radii } from '../../constants/tokens';
import { LocationSheet } from '../../components/LocationSheet';
import { DestinationSheet } from '../../components/DestinationSheet';
import { PaxSheet } from '../../components/PaxSheet';
import { GlowingPaxButton } from '../../components/GlowingPaxButton';
import { WeatherPill } from '../../components/WeatherIcon';
import { TabScreenEnter } from '../../components/TabScreenEnter';
import {
  SearchMorphOverlay,
  type SearchBarRect,
} from '../../components/SearchMorphOverlay';
import { defaultPax, type PaxMix } from '../../lib/flightRules';
import {
  weekendEscapes,
  dealsNow,
  nearbyAirports,
  formatFlightTime,
  type Destination,
  type NearbyAirport,
} from '../../data/destinations';
import { homeWeather } from '../../data/weather';

const { width: SW } = Dimensions.get('window');
const HPAD = spacing.lg;
const GRID_GAP = 12;
const CARD_W = (SW - HPAD * 2 - GRID_GAP) / 2;
const DEAL_W = 168;

const PIN_AT = 150; // origin chip pins once the hero pill scrolls past

// ═══════════════════════════════════════════════════════════
// Press-responsive card
// ═══════════════════════════════════════════════════════════

function PressCard({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      tension: 300,
      friction: 18,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════
// Screen
// ═══════════════════════════════════════════════════════════

export default function Home() {
  const router = useRouter();

  const [origin, setOrigin] = useState<NearbyAirport>(nearbyAirports[0]);
  const [locationOpen, setLocationOpen] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pax, setPax] = useState<PaxMix>(defaultPax);
  const [paxOpen, setPaxOpen] = useState(false);
  const [morphFrom, setMorphFrom] = useState<SearchBarRect | null>(null);
  const [morphing, setMorphing] = useState(false);

  const pinned = useRef(new Animated.Value(0)).current;
  const homeFade = useRef(new Animated.Value(1)).current;
  const isPinned = useRef(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarRef = useRef<View>(null);
  const morphLock = useRef(false);

  const openAirportSearch = useCallback(() => {
    if (morphLock.current) return;
    morphLock.current = true;
    searchBarRef.current?.measureInWindow((x, y, width, height) => {
      setMorphFrom({ x, y, width, height });
      setMorphing(true);
      // Fade all home chrome first — no jarring expand over live content
      Animated.timing(homeFade, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [homeFade]);

  const onMorphNavigate = useCallback(() => {
    router.push({ pathname: '/airport-search', params: { morph: '1' } });
  }, [router]);

  const onMorphFinished = useCallback(() => {
    setMorphing(false);
    setMorphFrom(null);
    // Keep home faded while it sits under the stack; restore for back nav
    requestAnimationFrame(() => {
      homeFade.setValue(1);
      morphLock.current = false;
    });
  }, [homeFade]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const should = y > PIN_AT;
      if (should !== isPinned.current) {
        isPinned.current = should;
        setHeaderScrolled(should);
        Animated.spring(pinned, {
          toValue: should ? 1 : 0,
          useNativeDriver: true,
          tension: 90,
          friction: 13,
        }).start();
      }
    },
    [pinned],
  );

  const showNotice = useCallback((msg: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotice(null);
    }, 2600);
  }, []);

  const chipOpacity = pinned;
  const weatherOpacity = pinned.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const chipShift = pinned.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });
  const weatherShift = pinned.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TabScreenEnter variant="explore" backgroundColor={palette.white}>
      <Animated.View style={[s.fadeRoot, { opacity: homeFade }]}>
        {/* ── Greeting: name left · weather/location swap + bell right ── */}
        <View style={s.greeting}>
          <Pressable style={s.profile} onPress={() => router.navigate('/account')}>
            <View style={s.avatar}>
              <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                RM
              </Text>
            </View>
            <Text variant="bodySmall">Hello, Ramesh</Text>
          </Pressable>

          <View style={s.greetingRight}>
            {/* Same slot: weather by default, location chip after scroll */}
            <View style={s.swapSlot}>
              <Animated.View
                style={[
                  s.swapItem,
                  {
                    opacity: weatherOpacity,
                    transform: [{ translateY: weatherShift }],
                  },
                ]}
                pointerEvents={headerScrolled ? 'none' : 'auto'}
              >
                <WeatherPill
                  weather={homeWeather(origin.city, origin.iata)}
                  onPress={() => {
                    const wx = homeWeather(origin.city, origin.iata);
                    showNotice(`${origin.city}: ${wx.tempC}° · ${wx.label}`);
                  }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  s.swapItem,
                  {
                    opacity: chipOpacity,
                    transform: [{ translateY: chipShift }],
                  },
                ]}
                pointerEvents={headerScrolled ? 'auto' : 'none'}
              >
                <Pressable style={s.originChip} onPress={() => setLocationOpen(true)}>
                  <Feather name="map-pin" size={12} color={palette.primary600} />
                  <Text
                    variant="caption"
                    style={{ color: palette.primary700, fontWeight: '600' }}
                  >
                    {origin.iata}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>

            <Pressable
              style={s.iconBtn}
              onPress={() => showNotice('No new alerts')}
            >
              <Feather name="bell" size={18} color={palette.gray600} />
            </Pressable>
          </View>
        </View>

        {notice && (
          <View style={s.notice}>
            <Feather name="info" size={14} color={palette.gray600} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {notice}
            </Text>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          scrollEnabled={!morphing}
        >
          {/* ── Origin ── */}
          <Pressable style={s.originPill} onPress={() => setLocationOpen(true)}>
            <Feather name="map-pin" size={14} color={palette.primary600} />
            <Text variant="bodySmall" color="textSecondary">
              Flying from{' '}
              <Text variant="bodySmall" style={{ fontWeight: '600', color: palette.gray900 }}>
                {origin.city} ({origin.iata})
              </Text>
            </Text>
            <Feather name="chevron-down" size={14} color={palette.gray500} />
          </Pressable>

          {/* ── Hero ── */}
          <Text variant="display" align="center" style={s.hero}>
            Where are you{'\n'}flying next?
          </Text>

          {/* Spacer keeps layout while the real pill is cloned into the overlay */}
          <View
            ref={searchBarRef}
            collapsable={false}
            style={[s.search, morphing && s.searchHidden]}
          >
            <GlowingPaxButton onPress={() => setPaxOpen(true)} />

            <Pressable
              style={s.searchField}
              onPress={openAirportSearch}
              accessibilityRole="button"
              accessibilityLabel="Search airports"
            >
              <Feather name="search" size={18} color={palette.gray400} />
              <Text variant="body" color="textTertiary" style={{ flex: 1 }}>
                Where to next?
              </Text>
            </Pressable>

            <Pressable
              style={s.searchGo}
              onPress={openAirportSearch}
              accessibilityRole="button"
              accessibilityLabel="Go to airport search"
              hitSlop={4}
            >
              <Feather name="arrow-right" size={18} color={palette.white} />
            </Pressable>
          </View>

        {/* ── Deals ── */}
        <View style={s.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Good fares right now</Text>
            <Text variant="caption" color="textTertiary">
              Below their usual price from {origin.iata}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dealStrip}
        >
          {dealsNow.map(({ dest, saving }) => {
            const pct = Math.round((saving / dest.typicalPrice) * 100);
            return (
              <PressCard
                key={dest.id}
                style={s.dealCard}
                onPress={() => setDestination(dest)}
              >
                <Image source={{ uri: dest.image }} style={s.dealImage} />
                <View style={s.dealScrim} />
                <View style={s.dealBadge}>
                  <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                    {pct}% off
                  </Text>
                </View>
                <View style={s.dealBody}>
                  <Text variant="bodyMedium" style={{ color: palette.white }}>
                    {dest.city}
                  </Text>
                  <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {dest.direct ? 'Direct' : '1 stop'} ·{' '}
                    {formatFlightTime(dest.flightMinutes)}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: palette.white, marginTop: 2 }}
                  >
                    ₹{dest.fromPrice.toLocaleString()}
                  </Text>
                </View>
              </PressCard>
            );
          })}
        </ScrollView>

        {/* ── Weekend escapes ── */}
        <View style={s.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Weekend escapes</Text>
            <Text variant="caption" color="textTertiary">
              Close enough to leave Friday and be back Sunday
            </Text>
          </View>
        </View>

        <View style={s.grid}>
          {weekendEscapes.map((d) => (
            <PressCard
              key={d.id}
              style={s.gridCard}
              onPress={() => setDestination(d)}
            >
              <Image source={{ uri: d.image }} style={s.gridImage} />
              <View style={s.gridScrim} />

              <View style={s.gridTime}>
                <Feather name="clock" size={11} color={palette.white} />
                <Text variant="caption" style={{ color: palette.white }}>
                  {formatFlightTime(d.flightMinutes)}
                </Text>
              </View>

              <View style={s.gridBody}>
                <Text style={s.gridCity}>{d.city}</Text>
                <Text
                  variant="caption"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  numberOfLines={2}
                >
                  {d.tagline}
                </Text>
                <View style={s.gridPrice}>
                  <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                    from ₹{d.fromPrice.toLocaleString()}
                  </Text>
                </View>
              </View>
            </PressCard>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
      </Animated.View>
      </TabScreenEnter>

      {/* ── Sheets ── */}
      <LocationSheet
        visible={locationOpen}
        currentIata={origin.iata}
        onClose={() => setLocationOpen(false)}
        onSelect={(a) => {
          setOrigin(a);
          setLocationOpen(false);
        }}
      />

      <DestinationSheet
        destination={destination}
        originIata={origin.iata}
        visible={destination !== null}
        onClose={() => setDestination(null)}
        onFindFlights={() => {
          setDestination(null);
          router.push('/flights');
        }}
      />

      <PaxSheet
        visible={paxOpen}
        pax={pax}
        onClose={() => setPaxOpen(false)}
        onApply={(next) => {
          setPax(next);
          setPaxOpen(false);
          // Continue into booking: airport → dates → flights
          setTimeout(() => openAirportSearch(), 220);
        }}
      />

      <SearchMorphOverlay
        visible={morphing}
        from={morphFrom}
        onNavigate={onMorphNavigate}
        onFinished={onMorphFinished}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  fadeRoot: { flex: 1 },

  // Greeting
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HPAD,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
    flexShrink: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  /** Weather and location chip share one slot so the name never truncates. */
  swapSlot: {
    minWidth: 108,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  swapItem: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  originChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.primary50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    minHeight: 40,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    marginHorizontal: HPAD,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },

  scroll: { paddingHorizontal: HPAD, paddingTop: spacing.lg },

  // Origin
  originPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },

  hero: { marginTop: spacing.lg, marginBottom: spacing.xl },

  // Search — soft float, passenger glow is on GlowingPaxButton
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 58,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 18,
    elevation: 3,
  },
  searchHidden: {
    opacity: 0,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  searchGo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // Deals
  dealStrip: { gap: GRID_GAP, paddingRight: HPAD },
  dealCard: {
    width: DEAL_W,
    height: 190,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dealImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  dealScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  dealBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  dealBody: { padding: spacing.md },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCard: {
    width: CARD_W,
    height: CARD_W * 1.28,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gridImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gridScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  gridTime: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  gridBody: { padding: spacing.md },
  gridCity: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    color: palette.white,
  },
  gridPrice: { marginTop: spacing.sm },
});
