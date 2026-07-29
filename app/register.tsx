import { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Input } from '../components/ui';
import { AuthOptions } from '../components/AuthOptions';
import { layout, palette, spacing, radii } from '../constants/tokens';
import {
  registerWithEmail,
  signInWithProvider,
  type AuthProvider,
} from '../lib/auth';

export default function Register() {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<AuthProvider | null>(null);

  const goAfterAuth = useCallback(
    (isNew: boolean) => {
      if (isNew) router.replace('/setup');
      else router.replace('/home');
    },
    [router],
  );

  const onSocial = useCallback(
    async (provider: 'google' | 'apple') => {
      setError(null);
      setLoading(provider);
      try {
        // Fresh demo emails so Register social path lands on setup
        const hint =
          provider === 'google'
            ? `new.google.${Date.now()}@gmail.com`
            : `new.apple.${Date.now()}@icloud.com`;
        const { isNew } = await signInWithProvider(provider, hint);
        goAfterAuth(isNew);
      } catch {
        setError('Something went wrong. Try again.');
      } finally {
        setLoading(null);
      }
    },
    [goAfterAuth],
  );

  const onEmailSubmit = useCallback(async () => {
    setError(null);
    setLoading('email');
    try {
      const result = await registerWithEmail(name, email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      goAfterAuth(true);
    } finally {
      setLoading(null);
    }
  }, [name, email, password, goAfterAuth]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={s.back}
            onPress={() => {
              if (emailMode) {
                setEmailMode(false);
                setError(null);
              } else if (router.canGoBack()) router.back();
              else router.replace('/sign-in');
            }}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={palette.gray700} />
          </Pressable>

          <Text variant="caption" color="textTertiary" style={s.eyebrow}>
            ALTITUDE
          </Text>
          <Text variant="display" style={s.title}>
            Create your account
          </Text>
          <Text variant="body" color="textSecondary" style={s.subtitle}>
            Save travellers, payments, and a home airport once — then booking
            stays quick.
          </Text>

          {!emailMode ? (
            <AuthOptions
              mode="register"
              loading={loading}
              onGoogle={() => onSocial('google')}
              onApple={() => onSocial('apple')}
              onEmail={() => {
                setError(null);
                setEmailMode(true);
              }}
            />
          ) : (
            <View style={s.form}>
              <Input
                label="Full name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                placeholder="As on your ID"
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                placeholder="At least 6 characters"
              />
              {error && (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={16} color={palette.error} />
                  <Text variant="caption" style={{ color: palette.error, flex: 1 }}>
                    {error}
                  </Text>
                </View>
              )}
              <Button
                label="Create account"
                onPress={onEmailSubmit}
                loading={loading === 'email'}
                rounded
              />
              {error?.includes('Sign in') && (
                <Pressable onPress={() => router.push('/sign-in')} hitSlop={6}>
                  <Text variant="bodySmall" style={s.link} align="center">
                    Sign in instead
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {!emailMode && error && (
            <View style={[s.errorBox, { marginTop: spacing.md }]}>
              <Feather name="alert-circle" size={16} color={palette.error} />
              <Text variant="caption" style={{ color: palette.error, flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          <View style={s.footer}>
            <Text variant="bodySmall" color="textSecondary" align="center">
              Already have an account?{' '}
              <Text
                variant="bodySmall"
                style={s.linkInline}
                onPress={() => router.push('/sign-in')}
              >
                Sign in
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  eyebrow: { letterSpacing: 1.2, marginBottom: spacing.sm },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xl },
  form: { gap: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.errorLight,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  footer: {
    marginTop: 'auto' as unknown as number,
    paddingTop: spacing.xl,
  },
  link: {
    color: palette.primary600,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  linkInline: {
    color: palette.primary600,
    fontWeight: '600',
  },
});
