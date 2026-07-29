import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Text } from './ui';
import { palette, spacing } from '../constants/tokens';

export type TabId = 'home' | 'trips' | 'saved' | 'account';

const TABS: {
  id: TabId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { id: 'home', label: 'Explore', icon: 'compass' },
  { id: 'trips', label: 'Trips', icon: 'map' },
  { id: 'saved', label: 'Saved', icon: 'heart' },
  { id: 'account', label: 'Account', icon: 'user' },
];

/**
 * Persistent app chrome — stays mounted while tab scenes dissolve.
 * Wired as the Tabs `tabBar` so it never slides with stack transitions.
 */
export function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const safe = useSafeAreaInsets();
  const bottom = Math.max(insets?.bottom ?? 0, safe.bottom, spacing.sm);
  const current = (state.routes[state.index]?.name ?? 'home') as TabId;

  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      {TABS.map((tab) => {
        const on = tab.id === current;
        const tint = on ? palette.primary500 : palette.gray400;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => {
              if (on) return;
              navigation.navigate(tab.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
          >
            <Feather
              name={tab.id === 'saved' && on ? 'heart' : tab.icon}
              size={21}
              color={tint}
            />
            <Text variant="caption" style={{ color: tint, marginTop: 3 }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
    backgroundColor: palette.white,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
});
