import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  SectionList,
  Pressable,
  StyleSheet,
  Keyboard,
  LayoutAnimation,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { AlphabetScrubber } from './AlphabetScrubber';
import { palette, spacing, radii, typography } from '../constants/tokens';
import { allAirports } from '../data/airports';
import { groupAirportsByLetter, searchAirports } from '../lib/airportSearch';
import { scrollAirportListToLetter } from '../lib/scrollToLetter';
import { useKeyboardLift } from '../hooks/useKeyboardLift';
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
 * Same interaction as `app/airport-search.tsx`: bottom search field, Z→A list,
 * magnified alphabet scrubber, and highlighted "Did you mean" results.
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
  const listRef = useRef<SectionList<Airport>>(null);
  const pendingLetter = useRef<string | null>(null);
  const keyboardLift = useKeyboardLift();

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    pendingLetter.current = null;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [visible]);

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

  const handleSelect = useCallback(
    (airport: Airport) => {
      Keyboard.dismiss();
      onSelect(airport);
      onClose();
    },
    [onSelect, onClose],
  );

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

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      heightRatio={0.94}
    >
      <View style={styles.content}>
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
                    selectedIata === item.iata && styles.rowSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.airportCity}>
                    {item.city} ({item.iata})
                  </Text>
                  {selectedIata === item.iata && (
                    <Feather name="check" size={18} color={palette.primary600} />
                  )}
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
      </View>

      <View style={[styles.searchBar, { marginBottom: spacing.md + keyboardLift }]}>
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },

  listContainer: { flex: 1, flexDirection: 'row' },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingRight: 36,
  },
  airportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  airportRowPressed: { backgroundColor: palette.gray50 },
  rowSelected: { backgroundColor: palette.primary50 },
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.gray400,
    letterSpacing: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  searchResults: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  noResults: {
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
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
