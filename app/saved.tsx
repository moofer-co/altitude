import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text, Button } from '../components/ui';
import { BottomNav } from '../components/BottomNav';
import { DestinationSheet } from '../components/DestinationSheet';
import { WeatherIcon } from '../components/WeatherIcon';
import { palette, spacing, radii } from '../constants/tokens';
import {
  favoriteDestinations,
  subscribeFavorites,
  toggleFavorite,
  setFavoriteNote,
  clearFavorites,
  removeFavorite,
} from '../data/favorites';
import { formatFlightTime, type Destination } from '../data/destinations';
import { getPreferences } from '../data/account';
import { weatherFor } from '../data/weather';

const HPAD = spacing.lg;

type SortKey = 'recent' | 'price' | 'name';

export default function Saved() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [sort, setSort] = useState<SortKey>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [destination, setDestination] = useState<Destination | null>(null);
  const originIata = getPreferences().homeAirport;

  useEffect(() => subscribeFavorites(() => setTick((n) => n + 1)), []);

  const items = useMemo(() => {
    void tick;
    const list = favoriteDestinations();
    if (sort === 'price') {
      return [...list].sort((a, b) => a.fromPrice - b.fromPrice);
    }
    if (sort === 'name') {
      return [...list].sort((a, b) => a.city.localeCompare(b.city));
    }
    return [...list].sort((a, b) => b.savedAt - a.savedAt);
  }, [tick, sort]);

  const beginNote = useCallback((id: string, note: string) => {
    setEditingId(id);
    setNoteDraft(note);
  }, []);

  const saveNote = useCallback(() => {
    if (!editingId) return;
    setFavoriteNote(editingId, noteDraft.trim());
    setEditingId(null);
    setNoteDraft('');
  }, [editingId, noteDraft]);

  const unsave = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeFavorite(id);
  }, []);

  const clearAll = useCallback(() => {
    Alert.alert(
      'Clear saved places?',
      'This removes every destination from Saved. You can add them again from Explore.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            clearFavorites();
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Saved</Text>
          <Text variant="caption" color="textTertiary">
            {items.length === 0
              ? 'Places you want to fly to'
              : `${items.length} place${items.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={clearAll} hitSlop={8} style={s.clearBtn}>
            <Text variant="bodySmall" style={{ color: palette.error, fontWeight: '600' }}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      {items.length > 0 && (
        <View style={s.sortRow}>
          {(
            [
              { key: 'recent', label: 'Recent' },
              { key: 'price', label: 'Price' },
              { key: 'name', label: 'A–Z' },
            ] as const
          ).map((opt) => {
            const on = sort === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[s.sortChip, on && s.sortChipOn]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSort(opt.key);
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: on ? palette.primary700 : palette.gray600,
                    fontWeight: on ? '700' : '500',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="heart" size={28} color={palette.primary500} />
            </View>
            <Text variant="h2" align="center">
              Nothing saved yet
            </Text>
            <Text
              variant="body"
              color="textSecondary"
              align="center"
              style={{ marginTop: spacing.sm }}
            >
              Tap the heart on a destination in Explore to keep it here for later.
            </Text>
            <Button
              label="Explore destinations"
              onPress={() => router.replace('/home')}
              rounded
              style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          items.map((d) => {
            const wx = weatherFor(`${d.city}-${d.iata}`);
            const editing = editingId === d.id;
            return (
              <View key={d.id} style={s.card}>
                <Pressable onPress={() => setDestination(d)}>
                  <Image source={{ uri: d.image }} style={s.image} />
                  <View style={s.scrim} />
                  <View style={s.weather}>
                    <WeatherIcon kind={wx.kind} size={20} />
                  </View>
                  <Pressable
                    style={s.heart}
                    onPress={() => unsave(d.id)}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${d.city} from saved`}
                  >
                    <Feather name="heart" size={18} color={palette.error} />
                  </Pressable>
                  <View style={s.cardBody}>
                    <Text style={s.city}>{d.city}</Text>
                    <Text variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {d.country} · {d.direct ? 'Direct' : '1 stop'} ·{' '}
                      {formatFlightTime(d.flightMinutes)}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: palette.white, marginTop: 4 }}
                    >
                      from ₹{d.fromPrice.toLocaleString()}
                    </Text>
                  </View>
                </Pressable>

                <View style={s.meta}>
                  {editing ? (
                    <View style={s.noteEdit}>
                      <TextInput
                        style={s.noteInput}
                        value={noteDraft}
                        onChangeText={setNoteDraft}
                        placeholder="Add a note — why this place?"
                        placeholderTextColor={palette.gray400}
                        autoFocus
                        maxLength={80}
                      />
                      <View style={s.noteActions}>
                        <Pressable
                          onPress={() => {
                            setEditingId(null);
                            setNoteDraft('');
                          }}
                          hitSlop={6}
                        >
                          <Text variant="bodySmall" color="textSecondary">
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable onPress={saveNote} hitSlop={6}>
                          <Text
                            variant="bodySmall"
                            style={{ color: palette.primary600, fontWeight: '700' }}
                          >
                            Save note
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={s.noteRow}
                      onPress={() => beginNote(d.id, d.note)}
                    >
                      <Feather
                        name="edit-3"
                        size={14}
                        color={d.note ? palette.primary600 : palette.gray400}
                      />
                      <Text
                        variant="bodySmall"
                        color={d.note ? 'text' : 'textTertiary'}
                        style={{ flex: 1 }}
                        numberOfLines={2}
                      >
                        {d.note || 'Add a note'}
                      </Text>
                    </Pressable>
                  )}

                  <View style={s.actions}>
                    <Pressable
                      style={s.secondaryBtn}
                      onPress={() => setDestination(d)}
                    >
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        Details
                      </Text>
                    </Pressable>
                    <Pressable
                      style={s.primaryBtn}
                      onPress={() => router.push('/flights')}
                    >
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.white, fontWeight: '600' }}
                      >
                        Find flights
                      </Text>
                      <Feather name="arrow-right" size={14} color={palette.white} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: spacing.lg }} />
      </ScrollView>

      <BottomNav active="saved" />

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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HPAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
    paddingBottom: spacing.md,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  sortChipOn: {
    backgroundColor: palette.primary50,
    borderColor: palette.primary200,
  },
  scroll: {
    paddingHorizontal: HPAD,
    flexGrow: 1,
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 168,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    height: 168,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  weather: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  city: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.white,
  },
  meta: {
    padding: spacing.md,
    gap: spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noteEdit: { gap: spacing.sm },
  noteInput: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: palette.gray900,
    backgroundColor: palette.gray50,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: radii.full,
    backgroundColor: palette.primary500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
});
