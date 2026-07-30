import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { palette, spacing, radii } from '../../../constants/tokens';

export default function CarbonPage() {
  return (
    <AccountSubpage title="Carbon footprint" subtitle="Coming soon">
      <View style={s.card}>
        <View style={s.icon}>
          <Feather name="wind" size={22} color={palette.successDark} />
        </View>
        <Text variant="bodyMedium" style={{ marginBottom: spacing.sm }}>
          Verified emissions, not estimates
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={{ lineHeight: 20 }}>
          Per-flight emissions and offsetting will appear here once we have verified
          data for every route and aircraft. We will not show numbers we cannot
          stand behind.
        </Text>
      </View>
    </AccountSubpage>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.successLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
});
