import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { palette, spacing, radii } from '../../../constants/tokens';

export default function DiscountsPage() {
  const router = useRouter();

  return (
    <AccountSubpage
      title="Discounts / Vouchers"
      subtitle="Bank offers and vouchers apply at payment"
    >
      <View style={s.info}>
        <Feather name="percent" size={20} color={palette.primary600} />
        <Text variant="bodySmall" color="textSecondary" style={{ flex: 1, lineHeight: 20 }}>
          Browse live offers anytime. During checkout, open payment and apply a
          matching bank or voucher code before you pay.
        </Text>
      </View>
      <Pressable
        style={s.cta}
        onPress={() => router.push('/(tabs)/offers')}
      >
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          Browse offers
        </Text>
        <Feather name="arrow-right" size={18} color={palette.white} />
      </Pressable>
    </AccountSubpage>
  );
}

const s = StyleSheet.create({
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.primary500,
  },
});
