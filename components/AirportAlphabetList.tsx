import { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  View,
  Pressable,
  StyleSheet,
  Keyboard,
  type ListRenderItemInfo,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { AlphabetScrubber } from './AlphabetScrubber';
import { palette, spacing, radii } from '../constants/tokens';
import { groupAirportsByLetter } from '../lib/airportSearch';
import type { Airport } from '../types';

const AIRPORT_ROW = 56;
const LETTER_ROW = 34;

type AirportRow = {
  key: string;
  kind: 'airport';
  airport: Airport;
  letter: string;
};

type LetterRow = {
  key: string;
  kind: 'letter';
  letter: string;
};

type Row = AirportRow | LetterRow;

function buildRows(airports: Airport[]) {
  const sections = groupAirportsByLetter(airports);
  const rows: Row[] = [];
  const letterOffset = new Map<string, number>();
  let offset = 0;

  for (const section of sections) {
    // Jump to the first airport in this letter group
    letterOffset.set(section.title, offset);
    for (const airport of section.data) {
      rows.push({
        key: `a-${airport.iata}-${airport.city}`,
        kind: 'airport',
        airport,
        letter: section.title,
      });
      offset += AIRPORT_ROW;
    }
    rows.push({
      key: `l-${section.title}`,
      kind: 'letter',
      letter: section.title,
    });
    offset += LETTER_ROW;
  }

  return {
    rows,
    letterOffset,
    activeLetters: new Set(sections.map((s) => s.title)),
  };
}

/**
 * Z→A airport list with a working alphabet scrubber.
 *
 * Uses FlatList + fixed row heights + scrollToOffset (SectionList
 * scrollToLocation is too unreliable for letter jumps).
 */
export function AirportAlphabetList({
  airports,
  selectedIata,
  onSelectAirport,
  onScrubStart,
}: {
  airports: Airport[];
  selectedIata?: string;
  onSelectAirport: (airport: Airport) => void;
  onScrubStart?: () => void;
}) {
  const listRef = useRef<FlatList<Row>>(null);
  const { rows, letterOffset, activeLetters } = useMemo(
    () => buildRows(airports),
    [airports],
  );

  const scrollToLetter = useCallback(
    (letter: string) => {
      const y = letterOffset.get(letter);
      if (y == null) return;
      listRef.current?.scrollToOffset({ offset: y, animated: false });
    },
    [letterOffset],
  );

  const beginScrub = useCallback(() => {
    Keyboard.dismiss();
    onScrubStart?.();
  }, [onScrubStart]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
      if (item.kind === 'letter') {
        return (
          <View style={styles.letterRow}>
            <Text style={styles.sectionLabel}>{item.letter}</Text>
          </View>
        );
      }

      const selected = selectedIata === item.airport.iata;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.airportRow,
            pressed && styles.airportRowPressed,
            selected && styles.rowSelected,
          ]}
          onPress={() => onSelectAirport(item.airport)}
        >
          <Text style={styles.airportCity}>
            {item.airport.city} ({item.airport.iata})
          </Text>
          {selected && (
            <Feather name="check" size={18} color={palette.primary600} />
          )}
        </Pressable>
      );
    },
    [onSelectAirport, selectedIata],
  );

  const getItemLayout = useCallback((_: ArrayLike<Row> | null | undefined, index: number) => {
    const item = rows[index];
    const length = item?.kind === 'letter' ? LETTER_ROW : AIRPORT_ROW;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += rows[i]?.kind === 'letter' ? LETTER_ROW : AIRPORT_ROW;
    }
    return { length, offset, index };
  }, [rows]);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={24}
        maxToRenderPerBatch={24}
        windowSize={11}
      />

      <View style={styles.scrubberLayer} pointerEvents="box-none">
        <AlphabetScrubber
          activeLetters={activeLetters}
          onScrubStart={beginScrub}
          onSelect={scrollToLetter}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingRight: 40,
  },
  scrubberLayer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    zIndex: 20,
    elevation: 20,
  },
  airportRow: {
    height: AIRPORT_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  airportRowPressed: {
    backgroundColor: palette.gray50,
  },
  rowSelected: {
    backgroundColor: palette.primary50,
  },
  airportCity: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '400',
    color: palette.gray900,
  },
  letterRow: {
    height: LETTER_ROW,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.gray400,
    letterSpacing: 1,
  },
});
