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
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { AirportAlphabetList } from './AirportAlphabetList';
import { SCRUBBER_SLOT_W } from './AlphabetScrubber';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import { allAirports } from '../data/airports';
import { searchAirports } from '../lib/airportSearch';
import type { Airport } from '../types';

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <Text style={styles.airportCity}>{text}</Text>;
  }
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <Text style={styles.airportCity}>{text}</Text>;
  return (
    <Text style={styles.airportCity}>
      {text.slice(0, idx)}
      <Text style={styles.airportCityBold}>
        {text.slice(idx, idx + highlight.length)}
      </Text>
      {text.slice(idx + highlight.length)}
    </Text>
  );
}

/**
 * Same interaction as airport search: Z→A list, working scrubber,
 * bottom search field, highlighted results.
 */
export function AirportSearchSheet({
  visible,
  selectedIata,
  title = 'Home airport',
  subtitle = 'Used as the default origin when you search',
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedIata?: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (airport: Airport) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [visible]);

  const isSearching = query.length > 0;
  const searchResults = useMemo(
    () => (isSearching ? searchAirports(query, allAirports) : []),
    [query, isSearching],
  );

  const beginScrub = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    if (query.length > 0) setQuery('');
  }, [query]);

  const handleSelect = useCallback(
    (airport: Airport) => {
      Keyboard.dismiss();
      onSelect(airport);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      heightRatio={0.94}
    >
      <View style={styles.content}>
        <AirportAlphabetList
          airports={allAirports}
          selectedIata={selectedIata}
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
                        selectedIata === airport.iata && styles.rowSelected,
                      ]}
                      onPress={() => handleSelect(airport)}
                    >
                      <HighlightedText
                        text={`${airport.city} (${airport.iata})`}
                        highlight={query}
                      />
                      {selectedIata === airport.iata && (
                        <Feather name="check" size={18} color={palette.primary600} />
                      )}
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

      <View style={[styles.searchBarWrap, { paddingBottom: spacing.md }]}>
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
            placeholder="Where from?"
            placeholderTextColor={palette.gray400}
            value={query}
            onChangeText={(text) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setQuery(text);
            }}
            selectionColor={palette.primary500}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              hitSlop={8}
            >
              <Feather name="x-circle" size={18} color={palette.gray400} />
            </Pressable>
          )}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, position: 'relative' },

  searchOverlay: {
    ...StyleSheet.absoluteFill,
    right: SCRUBBER_SLOT_W,
    backgroundColor: palette.white,
    zIndex: 10,
  },
  searchResults: { flex: 1 },
  searchResultsContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  didYouMean: {
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  resultRowPressed: { backgroundColor: palette.gray50 },
  rowSelected: { backgroundColor: palette.primary50 },
  noResults: {
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  airportCity: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '400',
    color: palette.gray900,
    flex: 1,
  },
  airportCityBold: {
    fontWeight: '700',
    color: palette.gray900,
  },

  searchBarWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    backgroundColor: palette.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray50,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.gray900,
    paddingVertical: spacing.sm,
  },
});
