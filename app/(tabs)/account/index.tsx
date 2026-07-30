import { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { TabScreenEnter } from '../../../components/TabScreenEnter';
import { ProfileSheet } from '../../../components/AccountSheets';
import { LoyaltySummary } from '../../../components/LoyaltySheets';
import { layout, palette, spacing, radii } from '../../../constants/tokens';
import { useNow } from '../../../data/trip';
import {
  getProfile,
  setProfile,
  subscribeProfile,
  getSavedAddress,
  subscribeSavedAddress,
  getPaymentMethods,
  subscribePaymentMethods,
  getTravellers,
  setTravellers,
  subscribeTravellers,
  spendSummary,
  formatAddressLine,
  syncSelfFromProfile,
  type Profile,
  type SavedAddress,
  type PaymentMethod,
} from '../../../data/account';
import {
  getLinkedLoyalty,
  subscribeLoyalty,
  type LinkedLoyalty,
} from '../../../data/loyalty';

const HPAD = layout.screenPadding;

export default function Account() {
  const now = useNow();
  const router = useRouter();
  const summary = useMemo(() => spendSummary(now), [now]);

  const [profile, setProfileState] = useState<Profile>(getProfile);
  const [address, setAddressState] = useState<SavedAddress>(getSavedAddress);
  const [methods, setMethodsState] = useState<PaymentMethod[]>(getPaymentMethods);
  const [loyalty, setLoyalty] = useState<LinkedLoyalty[]>(getLinkedLoyalty);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => subscribeProfile(() => setProfileState(getProfile())), []);
  useEffect(() => subscribeSavedAddress(() => setAddressState(getSavedAddress())), []);
  useEffect(() => subscribePaymentMethods(() => setMethodsState(getPaymentMethods())), []);
  useEffect(() => subscribeLoyalty(() => setLoyalty(getLinkedLoyalty())), []);
  useEffect(() => subscribeTravellers(() => {}), []);

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TabScreenEnter variant="account" backgroundColor={palette.gray50}>
        <View style={s.header}>
          <Text variant="h1">Account</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={s.profile} onPress={() => setProfileOpen(true)}>
            <View style={s.avatar}>
              <Text variant="h2" style={{ color: palette.white }}>
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h2">{profile.name}</Text>
              <Text variant="caption" color="textTertiary">
                {profile.email}
              </Text>
              <Text variant="caption" color="textTertiary">
                Since {profile.memberSince}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={palette.gray400} />
          </Pressable>

          <View style={s.spendCard}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textTertiary">
                Spent this year
              </Text>
              <Text style={s.spendAmount}>
                {summary.currency}
                {summary.thisYear.toLocaleString()}
              </Text>
            </View>
            <Pressable
              style={s.spendBtn}
              onPress={() => router.push('/account/spend')}
            >
              <Text
                variant="caption"
                style={{ color: palette.primary600, fontWeight: '600' }}
              >
                Spend history
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={s.carbon}
            onPress={() => router.push('/account/carbon')}
          >
            <View style={s.carbonIcon}>
              <Feather name="wind" size={18} color={palette.successDark} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.carbonTitleRow}>
                <Text variant="bodyMedium">Carbon footprint</Text>
                <View style={s.soonTag}>
                  <Text
                    variant="caption"
                    style={{ color: palette.gray600, fontWeight: '600' }}
                  >
                    Coming soon
                  </Text>
                </View>
              </View>
              <Text variant="caption" color="textTertiary" numberOfLines={2}>
                Per-flight emissions and offsetting, once verified.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.gray400} />
          </Pressable>

          <View style={s.card}>
            <MenuRow
              icon="users"
              label="Passengers list"
              onPress={() => router.push('/account/passengers')}
            />
            <MenuRow
              icon="map-pin"
              label="Saved address"
              detail={formatAddressLine(address)}
              onPress={() => router.push('/account/address')}
            />
            <MenuRow
              icon="sliders"
              label="Travel preferences"
              last
              onPress={() => router.push('/account/preferences')}
            />
          </View>

          <View style={s.card}>
            <MenuRow
              icon="bell"
              label="Notifications"
              onPress={() => router.push('/account/notifications')}
            />
            <MenuRow
              icon="percent"
              label="Discounts / Vouchers"
              last
              onPress={() => router.push('/account/discounts')}
            />
          </View>

          <LoyaltySummary
            linked={loyalty}
            onPress={() => router.push('/account/loyalty')}
          />

          <View style={s.card}>
            <MenuRow
              icon="credit-card"
              label="Payment methods"
              detail={
                methods.find((m) => m.primary)?.label ??
                `${methods.length} method${methods.length === 1 ? '' : 's'}`
              }
              last
              onPress={() => router.push('/account/payments')}
            />
          </View>

          <View style={s.card}>
            <MenuRow
              icon="shield"
              label="Support"
              last
              onPress={() => router.push('/account/support')}
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </TabScreenEnter>

      <ProfileSheet
        visible={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onSave={(p) => {
          setProfile(p);
          setTravellers(syncSelfFromProfile(getTravellers(), p));
          setProfileOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  label,
  detail,
  last,
  onPress,
}: {
  icon: string;
  label: string;
  detail?: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.row, last && s.rowLast]} onPress={onPress}>
      <View style={s.rowIcon}>
        <Feather name={icon as never} size={17} color={palette.gray700} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium">{label}</Text>
        {detail ? (
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={palette.gray400} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.gray50 },
  header: {
    paddingHorizontal: HPAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  scroll: {
    paddingHorizontal: HPAD,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  spendAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 34,
    marginTop: 2,
  },
  spendBtn: {
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  carbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.successLight,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  carbonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carbonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  soonTag: {
    backgroundColor: palette.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
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
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
