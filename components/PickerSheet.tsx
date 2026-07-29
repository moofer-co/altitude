import { useState, useMemo } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';

/**
 * A dedicated sheet for choosing one value from a list. Dropdowns nested
 * inside a scrolling sheet fight for the pan gesture and jump around; a
 * separate sheet that opens, takes the choice and closes is unambiguous.
 */
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  searchable,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  searchable?: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} heightRatio={0.8}>
      {searchable && (
        <View style={s.searchWrap}>
          <View style={s.search}>
            <Feather name="search" size={17} color={palette.gray500} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={17} color={palette.gray500} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
      >
        {filtered.map((opt) => {
          const on = opt === selected;
          return (
            <Pressable
              key={opt}
              style={[s.row, on && s.rowOn]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
            >
              <Text
                variant="body"
                style={on ? { color: palette.primary700, fontWeight: '600' } : undefined}
              >
                {opt}
              </Text>
              {on && <Feather name="check" size={18} color={palette.primary600} />}
            </Pressable>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text variant="bodySmall" color="textTertiary" align="center">
              Nothing matches “{query}”
            </Text>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchInput: { ...typography.body, flex: 1, color: palette.gray900 },

  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderRadius: radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  rowOn: { backgroundColor: palette.primary50 },
  empty: { paddingTop: spacing['3xl'] },
});
