import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  SectionList,
  Pressable,
  StyleSheet,
  Keyboard,
  LayoutAnimation,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Row } from '../components/ui';
import { AlphabetScrubber } from '../components/AlphabetScrubber';
import { AirportSearchSheet } from '../components/AirportSearchSheet';
import { palette, spacing, radii, typography } from '../constants/tokens';
import { allAirports, airports } from '../data/airports';
import {
  getPreferences,
  updatePreferences,
  subscribePreferences,
} from '../data/account';
import { groupAirportsByLetter, searchAirports } from '../lib/airportSearch';
import { scrollAirportListToLetter } from '../lib/scrollToLetter';
import { useKeyboardLift } from '../hooks/useKeyboardLift';
import type { Airport } from '../types';

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <Text style={styles.airportCity}>{text}</Text>;
  }

  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) {
    return <Text style={styles.airportCity}>{text}</Text>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);

  return (
    <Text style={styles.airportCity}>
      {before}
      <Text style={styles.airportCityBold}>{match}</Text>
      {after}
    </Text>
  );
}

export default function AirportSearch() {
  const router = useRouter();
  const { morph } = useLocalSearchParams<{ morph?: string }>();
  const fromMorph = morph === '1';
  const keyboardLift = useKeyboardLift();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Airport | null>(null);
  const [homeOpen, setHomeOpen] = useState(false);
  const [prefs, setPrefs] = useState(getPreferences);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<SectionList<Airport>>(null);
  const pendingLetter = useRef<string | null>(null);

  // Staged entrance: list → search field → home airport pill
  const listEnter = useRef(new Animated.Value(fromMorph ? 0 : 1)).current;
  const searchEnter = useRef(new Animated.Value(fromMorph ? 0 : 1)).current;
  const headerEnter = useRef(new Animated.Value(fromMorph ? 0 : 1)).current;

  useEffect(() => subscribePreferences(() => setPrefs(getPreferences())), []);

  useEffect(() => {
    if (!fromMorph) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }

    const ease = Easing.out(Easing.cubic);

    Animated.sequence([
      Animated.delay(40),
      Animated.parallel([
        Animated.timing(listEnter, {
          toValue: 1,
          duration: 360,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(searchEnter, {
          toValue: 1,
          duration: 320,
          delay: 60,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(headerEnter, {
          toValue: 1,
          duration: 340,
          delay: 200,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const focusAt = setTimeout(() => inputRef.current?.focus(), 520);
    return () => clearTimeout(focusAt);
  }, [fromMorph, listEnter, searchEnter, headerEnter]);

  const homeAirport = useMemo(() => {
    return (
      airports.find((a) => a.iata === prefs.homeAirport) ??
      allAirports.find((a) => a.iata === prefs.homeAirport) ??
      null
    );
  }, [prefs.homeAirport]);

  const isSearching = query.length > 0;
  const sections = useMemo(() => groupAirportsByLetter(allAirports), []);
  const searchResults = useMemo(
    () => (isSearching ? searchAirports(query, allAirports) : []),
    [query, isSearching],
  );
  const activeLetters = useMemo(
    () => new Set(sections.map((s) => s.title)),
    [sections],
  );

  const scrollToLetter = useCallback(
    (letter: string) => {
      scrollAirportListToLetter(listRef, sections, letter);
    },
    [sections],
  );

  // After clearing search for a scrub, scroll once the list is back
  useEffect(() => {
    if (isSearching || !pendingLetter.current) return;
    const letter = pendingLetter.current;
    pendingLetter.current = null;
    const t = setTimeout(() => scrollToLetter(letter), 32);
    return () => clearTimeout(t);
  }, [isSearching, scrollToLetter]);

  const beginScrub = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, []);

  const handleSelect = useCallback((airport: Airport) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(airport);
    Keyboard.dismiss();
  }, []);

  const handleScrubberSelect = useCallback(
    (letter: string) => {
      Keyboard.dismiss();
      inputRef.current?.blur();
      if (query.length > 0) {
        pendingLetter.current = letter;
        setQuery('');
        return;
      }
      scrollToLetter(letter);
    },
    [query, scrollToLetter],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const homeLabel = homeAirport
    ? `${homeAirport.city}, ${homeAirport.country}`
    : prefs.homeAirport;

  return (
    <SafeAreaView
      style={[styles.safe, keyboardLift > 0 && { marginBottom: keyboardLift }]}
      edges={['top', 'bottom']}
    >
      <Animated.View
        style={{
          opacity: headerEnter,
          transform: [
            {
              translateY: headerEnter.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
              }),
            },
          ],
        }}
      >
        <Row justify="space-between" style={styles.header}>
          <Pressable
            style={styles.locationPill}
            onPress={() => {
              Keyboard.dismiss();
              setHomeOpen(true);
            }}
          >
            <Feather name="map-pin" size={14} color={palette.primary600} />
            <Text variant="bodySmall" numberOfLines={1} style={styles.locationText}>
              {homeLabel}
            </Text>
            <Feather name="chevron-down" size={14} color={palette.gray500} />
          </Pressable>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
            }}
            hitSlop={6}
          >
            <Feather name="x" size={20} color={palette.gray600} />
          </Pressable>
        </Row>
      </Animated.View>

      {selected && (
        <View style={styles.selectedBanner}>
          <Text variant="bodyMedium" color="textInverse">
            Selected: {selected.city} ({selected.iata})
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: listEnter,
            transform: [
              {
                translateY: listEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.listContainer}>
          {isSearching ? (
            <View style={styles.searchResults}>
              {searchResults.length > 0 ? (
                <>
                  <Text
                    variant="caption"
                    color="textTertiary"
                    style={styles.didYouMean}
                  >
                    Did you mean
                  </Text>
                  {searchResults.map((airport) => (
                    <Pressable
                      key={`${airport.iata}-${airport.city}`}
                      style={({ pressed }) => [
                        styles.resultRow,
                        pressed && styles.resultRowPressed,
                      ]}
                      onPress={() => handleSelect(airport)}
                    >
                      <HighlightedText
                        text={`${airport.city} (${airport.iata})`}
                        highlight={query}
                      />
                    </Pressable>
                  ))}
                </>
              ) : (
                <View style={styles.noResults}>
                  <Text variant="body" color="textTertiary" align="center">
                    No airports found
                  </Text>
                  <Text variant="caption" color="textTertiary" align="center">
                    Try a different city or airport code
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <SectionList
              ref={listRef}
              style={styles.list}
              sections={sections}
              keyExtractor={(item, index) => `${item.iata}-${item.city}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.airportRow,
                    pressed && styles.airportRowPressed,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.airportCity}>
                    {item.city} ({item.iata})
                  </Text>
                </Pressable>
              )}
              renderSectionFooter={({ section }) => (
                <Text style={styles.sectionLabel}>{section.title}</Text>
              )}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollToIndexFailed={(info) => {
                const y = Math.max(
                  0,
                  info.averageItemLength * info.highestMeasuredFrameIndex,
                );
                listRef.current
                  ?.getScrollResponder()
                  ?.scrollTo({ y, animated: false });
              }}
            />
          )}
          <AlphabetScrubber
            activeLetters={activeLetters}
            onScrubStart={beginScrub}
            onSelect={handleScrubberSelect}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: searchEnter,
          transform: [
            {
              translateY: searchEnter.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.searchBar}>
          <Feather
            name="search"
            size={18}
            color={palette.gray400}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Where to next?"
            placeholderTextColor={palette.gray400}
            value={query}
            onChangeText={(text) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setQuery(text);
            }}
            selectionColor={palette.primary500}
            autoFocus={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Feather name="x-circle" size={18} color={palette.gray400} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <AirportSearchSheet
        visible={homeOpen}
        selectedIata={prefs.homeAirport}
        title="Home airport"
        subtitle="Default origin for search — same picker as Account"
        onClose={() => setHomeOpen(false)}
        onSelect={(airport) => {
          updatePreferences({ homeAirport: airport.iata });
          setHomeOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.white,
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    maxWidth: '78%',
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  locationText: {
    flexShrink: 1,
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

  selectedBanner: {
    backgroundColor: palette.primary500,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  listContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingRight: 36,
  },
  airportRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  airportRowPressed: {
    backgroundColor: palette.gray50,
  },
  airportCity: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '400',
    color: palette.gray900,
  },
  airportCityBold: {
    fontWeight: '700',
    color: palette.gray900,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: palette.gray400,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  searchResults: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  didYouMean: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  resultRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  resultRowPressed: {
    backgroundColor: palette.gray50,
  },
  noResults: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: palette.white,
    gap: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.gray900,
    paddingVertical: spacing.sm,
  },
});
