import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import {
  HelpCentreSheet,
  TermsSheet,
  SignOutSheet,
} from '../../../components/AccountSheets';
import { palette, spacing, radii } from '../../../constants/tokens';

type SheetKind = 'help' | 'terms' | 'signout' | null;

export default function SupportPage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKind>(null);

  return (
    <AccountSubpage title="Support" subtitle="Help, legal, and sign out">
      <View style={s.card}>
        <MenuRow
          icon="help-circle"
          label="Help centre"
          onPress={() => setSheet('help')}
        />
        <MenuRow
          icon="file-text"
          label="Terms and privacy"
          onPress={() => setSheet('terms')}
        />
        <MenuRow
          icon="log-out"
          label="Sign out"
          danger
          last
          onPress={() => setSheet('signout')}
        />
      </View>

      <HelpCentreSheet visible={sheet === 'help'} onClose={() => setSheet(null)} />
      <TermsSheet visible={sheet === 'terms'} onClose={() => setSheet(null)} />
      <SignOutSheet
        visible={sheet === 'signout'}
        onClose={() => setSheet(null)}
        onConfirm={() => {
          setSheet(null);
          router.replace('/onboarding');
        }}
      />
    </AccountSubpage>
  );
}

function MenuRow({
  icon,
  label,
  danger,
  last,
  onPress,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.row, last && s.rowLast]} onPress={onPress}>
      <View style={s.icon}>
        <Feather
          name={icon as never}
          size={16}
          color={danger ? palette.error : palette.gray600}
        />
      </View>
      <Text
        variant="bodySmall"
        style={{ flex: 1, color: danger ? palette.error : palette.gray900 }}
      >
        {label}
      </Text>
      {!danger && (
        <Feather name="chevron-right" size={18} color={palette.gray400} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  rowLast: { borderBottomWidth: 0 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
