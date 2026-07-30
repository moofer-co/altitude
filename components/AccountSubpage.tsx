import { View, Pressable, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { layout, palette, spacing } from '../constants/tokens';

const HPAD = layout.screenPadding;

/**
 * Full-screen child under Account — back + title, content on the page.
 * Sheets are reserved for add/edit forms opened from these pages.
 */
export function AccountSubpage({
  title,
  subtitle,
  children,
  scroll = true,
  contentStyle,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  footer?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable
          style={s.back}
          onPress={() => {
            if (router.canGoBack()) router.back();
          }}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={22} color={palette.gray900} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h2" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textTertiary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.body, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.body, { flex: 1 }, contentStyle]}>{children}</View>
      )}

      {footer}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: HPAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: palette.gray50,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: HPAD,
    paddingBottom: spacing.xl,
  },
});
