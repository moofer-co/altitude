import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  LayoutAnimation,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Row } from '../components/ui';
import { AirportAlphabetList } from '../components/AirportAlphabetList';
import { AirportSearchSheet } from '../components/AirportSearchSheet';
import { KeyboardBottomPad } from '../components/KeyboardBottomPad';
import { PageEnter } from '../components/TabScreenEnter';
import { SCRUBBER_SLOT_W } from '../components/AlphabetScrubber';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import { allAirports, airports } from '../data/airports';
import {
  getPreferences,
  updatePreferences,
  subscribePreferences,
} from '../data/account';
import { searchAirports } from '../lib/airportSearch';
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

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Airport | null>(null);
  const [homeOpen, setHomeOpen] = useState(false);
  const [prefs, setPrefs] = useState(getPreferences);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => subscribePreferences(() => setPrefs(getPreferences())), []);

  // Focus after skeleton dissolve so the keyboard doesn't fight the enter
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), fromMorph ? 560 : 480);
    return () => clearTimeout(t);
  }, [fromMorph]);

  const homeAirport = useMemo(() => {
    return (
      airports.find((a) => a.iata === prefs.homeAirport) ??
      allAirports.find((a) => a.iata === prefs.homeAirport) ??
      null
    );
  }, [prefs.homeAirport]);

  const isSearching = query.length > 0;
  const searchResults = useMemo(
    () => (isSearching ? searchAirports(query, allAirports) : []),
    [query, isSearching],
  );

  const handleSelect = useCallback(
    (airport: Airport) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelected(airport);
      Keyboard.dismiss();
      inputRef.current?.blur();
      // Single-city path: destination → date → flights
      router.push({
        pathname: '/date-select',
        params: { to: airport.iata, city: airport.city },
      });
    },
    [router],
  );

  const beginScrub = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    if (query.length > 0) setQuery('');
  }, [query]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const homeLabel = homeAirport
    ? `${homeAirport.city}, ${homeAirport.country}`
    : prefs.homeAirport;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageEnter variant="search" backgroundColor={palette.white}>
      <View>
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

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                router.push('/multi-city');
              }}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Add multi-city itinerary"
            >
              <Text variant="bodySmall" style={styles.multiCityLink}>
                + Multi-city
              </Text>
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
          </View>
        </Row>
      </View>

      {selected && (
        <View style={styles.selectedBanner}>
          <Text variant="bodyMedium" color="textInverse">
            Selected: {selected.city} ({selected.iata})
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <AirportAlphabetList
          airports={allAirports}
          selectedIata={selected?.iata}
          onSelectAirport={handleSelect}
          onScrubStart={beginScrub}
        />

        {isSearching && (
          <View style={styles.searchOverlay} pointerEvents="auto">
            <ScrollView
              style={styles.searchResults}
              contentContainerStyle={styles.searchResultsContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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
            </ScrollView>
          </View>
        )}
      </View>

      <KeyboardBottomPad style={styles.searchBarChrome}>
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
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <Feather name="x-circle" size={18} color={palette.gray400} />
              </Pressable>
            )}
          </View>
        </KeyboardBottomPad>
      </PageEnter>

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
    paddingHorizontal: layout.screenPadding,
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
    flexShrink: 1,
    maxWidth: '52%',
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  locationText: {
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  multiCityLink: {
    color: palette.primary600,
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

  selectedBanner: {
    backgroundColor: palette.primary500,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  searchOverlay: {
    ...StyleSheet.absoluteFill,
    right: SCRUBBER_SLOT_W,
    backgroundColor: palette.white,
    zIndex: 10,
  },
  searchResults: {
    flex: 1,
  },
  searchResultsContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenPadding,
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

  searchBarChrome: {
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
