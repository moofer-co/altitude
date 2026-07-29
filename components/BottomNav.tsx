import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing } from '../constants/tokens';

export type TabId = 'home' | 'trips' | 'saved' | 'account';

const TABS: {
  id: TabId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}[] = [
  { id: 'home', label: 'Explore', icon: 'compass', route: '/home' },
  { id: 'trips', label: 'Trips', icon: 'map', route: '/trips' },
  { id: 'saved', label: 'Saved', icon: 'heart', route: '/saved' },
  { id: 'account', label: 'Account', icon: 'user', route: '/account' },
];

function tabFromPath(path: string | null): TabId | null {
  if (!path) return null;
  if (path.includes('home')) return 'home';
  if (path.includes('trips')) return 'trips';
  if (path.includes('saved')) return 'saved';
  if (path.includes('account')) return 'account';
  return null;
}

/**
 * Primary app chrome — Explore / Trips / Saved / Account.
 * Shown on main tab screens only (not auth, search, booking, etc.).
 */
export function BottomNav({ active }: { active?: TabId }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const current = active ?? tabFromPath(pathname) ?? 'home';

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      {TABS.map((tab) => {
        const on = tab.id === current;
        const tint = on ? palette.primary500 : palette.gray400;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => {
              if (on) return;
              router.replace(tab.route as never);
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
