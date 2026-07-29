import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ListRow, Divider } from '../components/ui';
import { colors, spacing, palette } from '../constants/tokens';

const screens = [
  { route: '/onboarding', label: 'Onboarding', status: 'built' },
  { route: '/home', label: 'Home', status: 'built' },
  { route: '/airport-search', label: 'Airport search', status: 'built' },
  { route: '/multi-city', label: 'Multi-city', status: 'built' },
  { route: '/date-select', label: 'Date selection', status: 'built' },
  { route: '/flights', label: 'Flight recommendations', status: 'built' },
  { route: '/booking', label: 'Booking', status: 'built' },
  { route: '/itinerary', label: 'Itinerary', status: 'built' },
  { route: '/trips', label: 'Trips', status: 'built' },
  { route: '/account', label: 'Account', status: 'built' },
] as const;

export default function DevMenu() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="caption" color="textTertiary">DEV MENU</Text>
          <Text variant="display">Altitude</Text>
          <Text variant="bodySmall" color="textSecondary" style={styles.subtitle}>
            Tap a screen to preview it.
          </Text>
        </View>

        <View style={styles.list}>
          {screens.map((screen, i) => (
            <View key={screen.route}>
              <ListRow onPress={() => router.push(screen.route as any)}>
                <View style={styles.row}>
                  <Text variant="bodyMedium">{screen.label}</Text>
                  <View
                    style={[
                      styles.badge,
                      screen.status === 'built' ? styles.badgeBuilt : styles.badgeStub,
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: screen.status === 'built' ? palette.success : palette.gray500,
                      }}
                    >
                      {screen.status}
                    </Text>
                  </View>
                </View>
              </ListRow>
              {i < screens.length - 1 && <Divider spacing="sm" />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  list: {
    gap: 0,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.xs,
  },
  badgeBuilt: {
    backgroundColor: palette.successLight,
  },
  badgeStub: {
    backgroundColor: palette.gray100,
  },
});
