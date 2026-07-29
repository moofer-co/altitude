import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import type { AuthProvider } from '../lib/auth';

type Props = {
  mode: 'sign-in' | 'register';
  loading?: AuthProvider | null;
  onGoogle: () => void;
  onApple: () => void;
  onEmail: () => void;
};

function ProviderButton({
  label,
  icon,
  onPress,
  loading,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        pressed && !loading && (primary ? styles.btnPrimaryPressed : styles.btnSecondaryPressed),
        loading && styles.btnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator
          color={primary ? palette.white : palette.gray800}
          size="small"
        />
      ) : (
        <>
          <View style={styles.iconSlot}>{icon}</View>
          <Text
            variant="bodyMedium"
            style={{ color: primary ? palette.white : palette.gray900, flex: 1 }}
            align="center"
          >
            {label}
          </Text>
          <View style={styles.iconSlot} />
        </>
      )}
    </Pressable>
  );
}

/**
 * Shared Sign in / Register provider choices.
 */
export function AuthOptions({
  mode,
  loading = null,
  onGoogle,
  onApple,
  onEmail,
}: Props) {
  const verb = mode === 'sign-in' ? 'Continue' : 'Register';

  return (
    <View style={styles.stack}>
      <ProviderButton
        label={`${verb} with Google`}
        loading={loading === 'google'}
        onPress={onGoogle}
        icon={
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: '#EA4335' }}>
            G
          </Text>
        }
      />
      <ProviderButton
        label={`${verb} with Apple`}
        loading={loading === 'apple'}
        onPress={onApple}
        icon={<Feather name="smartphone" size={18} color={palette.gray900} />}
      />
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text variant="caption" color="textTertiary" style={styles.orText}>
          or
        </Text>
        <View style={styles.orLine} />
      </View>
      <ProviderButton
        label={`${verb} with email`}
        loading={loading === 'email'}
        onPress={onEmail}
        primary
        icon={<Feather name="mail" size={18} color={palette.white} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  btn: {
    minHeight: 54,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnSecondary: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  btnSecondaryPressed: {
    backgroundColor: palette.gray50,
  },
  btnPrimary: {
    backgroundColor: palette.primary500,
  },
  btnPrimaryPressed: {
    backgroundColor: palette.primary600,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
  },
  orText: {
    letterSpacing: 0.5,
  },
});
