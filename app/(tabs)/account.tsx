import { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../components/ui';
import { TabScreenEnter } from '../../components/TabScreenEnter';
import { PickerSheet } from '../../components/PickerSheet';
import { AirportSearchSheet } from '../../components/AirportSearchSheet';
import {
  ProfileSheet,
  TravellerSheet,
  TravellersListSheet,
  AddressSheet,
  PreferencesSheet,
  NotificationsSheet,
  PaymentMethodsListSheet,
  PaymentMethodSheet,
  SpendHistorySheet,
  DiscountsSheet,
  CarbonSheet,
  SupportMenuSheet,
  HelpCentreSheet,
  TermsSheet,
  SignOutSheet,
} from '../../components/AccountSheets';
import { LoyaltySheet, LoyaltySummary } from '../../components/LoyaltySheets';
import { layout, palette, spacing, radii } from '../../constants/tokens';
import { useNow } from '../../data/trip';
import { airports } from '../../data/airports';
import {
  initialProfile,
  initialTravellers,
  initialNotifications,
  initialPaymentMethods,
  initialSavedAddress,
  getPreferences,
  updatePreferences,
  subscribePreferences,
  spendSummary,
  topRoutes,
  syncSelfFromProfile,
  withPrimary,
  paymentMethodDetail,
  formatAddressLine,
  PREF_META,
  CURRENCIES,
  type Profile,
  type SavedTraveller,
  type Preferences,
  type PrefKey,
  type NotificationSetting,
  type PaymentMethod,
  type SavedAddress,
} from '../../data/account';
import {
  getLinkedLoyalty,
  subscribeLoyalty,
  upsertLinkedLoyalty,
  unlinkLoyalty,
  type LinkedLoyalty,
} from '../../data/loyalty';

const HPAD = layout.screenPadding;

type SheetKind =
  | 'profile'
  | 'spend'
  | 'travellers'
  | 'traveller'
  | 'address'
  | 'preferences'
  | 'notifications'
  | 'discounts'
  | 'carbon'
  | 'payments'
  | 'payment'
  | 'loyalty'
  | 'support'
  | 'help'
  | 'terms'
  | 'signout'
  | 'homeAirport'
  | null;

type PrefPickerKey = Exclude<PrefKey, 'homeAirport'>;

export default function Account() {
  const now = useNow();
  const router = useRouter();
  const summary = useMemo(() => spendSummary(now), [now]);
  const routes = useMemo(() => topRoutes(), []);

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [travellers, setTravellers] = useState<SavedTraveller[]>(initialTravellers);
  const [prefs, setPrefs] = useState<Preferences>(getPreferences);
  const [notifs, setNotifs] = useState<NotificationSetting[]>(initialNotifications);
  const [methods, setMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [address, setAddress] = useState<SavedAddress>(initialSavedAddress);
  const [loyalty, setLoyalty] = useState<LinkedLoyalty[]>(getLinkedLoyalty);

  useEffect(() => subscribeLoyalty(() => setLoyalty(getLinkedLoyalty())), []);
  useEffect(() => subscribePreferences(() => setPrefs(getPreferences())), []);

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [editTraveller, setEditTraveller] = useState<SavedTraveller | null>(null);
  const [addingTraveller, setAddingTraveller] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentMethod | null>(null);
  const [addingPayment, setAddingPayment] = useState(false);
  const [prefPicker, setPrefPicker] = useState<PrefPickerKey | null>(null);
  /** Return to this sheet after a nested editor closes */
  const [returnTo, setReturnTo] = useState<SheetKind>(null);

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const toggleNotif = (id: string) =>
    setNotifs((list) =>
      list.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)),
    );

  const closeSheets = () => {
    setSheet(null);
    setReturnTo(null);
    setAddingTraveller(false);
    setAddingPayment(false);
  };

  const backOrClose = () => {
    if (returnTo) {
      setSheet(returnTo);
      setReturnTo(null);
      setAddingTraveller(false);
      setAddingPayment(false);
      return;
    }
    closeSheets();
  };

  const openTraveller = (t: SavedTraveller) => {
    setEditTraveller(t);
    setAddingTraveller(false);
    setReturnTo('travellers');
    setSheet('traveller');
  };

  const openAddTraveller = () => {
    setEditTraveller(null);
    setAddingTraveller(true);
    setReturnTo('travellers');
    setSheet('traveller');
  };

  const openPayment = (pm: PaymentMethod) => {
    setEditPayment(pm);
    setAddingPayment(false);
    setReturnTo('payments');
    setSheet('payment');
  };

  const openAddPayment = () => {
    setEditPayment(null);
    setAddingPayment(true);
    setReturnTo('payments');
    setSheet('payment');
  };

  const homeAirportLabel = (() => {
    const a = airports.find((x) => x.iata === prefs.homeAirport);
    return a ? `${a.iata} · ${a.city}` : prefs.homeAirport;
  })();

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
          {/* Profile */}
          <Pressable style={s.profile} onPress={() => setSheet('profile')}>
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

          {/* Spend — amount only; history & stats live underneath */}
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
            <Pressable style={s.spendBtn} onPress={() => setSheet('spend')}>
              <Text
                variant="caption"
                style={{ color: palette.primary600, fontWeight: '600' }}
              >
                Spend history
              </Text>
            </Pressable>
          </View>

          {/* Carbon — compact; detail underneath */}
          <Pressable style={s.carbon} onPress={() => setSheet('carbon')}>
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

          {/* Profile & preferences */}
          <View style={s.card}>
            <MenuRow
              icon="users"
              label="Passengers list"
              onPress={() => setSheet('travellers')}
            />
            <MenuRow
              icon="map-pin"
              label="Saved address"
              detail={formatAddressLine(address)}
              onPress={() => setSheet('address')}
            />
            <MenuRow
              icon="sliders"
              label="Travel preferences"
              last
              onPress={() => setSheet('preferences')}
            />
          </View>

          {/* Notifications & promos */}
          <View style={s.card}>
            <MenuRow
              icon="bell"
              label="Notifications"
              onPress={() => setSheet('notifications')}
            />
            <MenuRow
              icon="percent"
              label="Discounts / Vouchers"
              last
              onPress={() => setSheet('discounts')}
            />
          </View>

          {/* Loyalty */}
          <LoyaltySummary linked={loyalty} onPress={() => setSheet('loyalty')} />

          {/* Payment */}
          <View style={s.card}>
            <MenuRow
              icon="credit-card"
              label="Payment methods"
              detail={
                methods.find((m) => m.primary)?.label ??
                `${methods.length} method${methods.length === 1 ? '' : 's'}`
              }
              last
              onPress={() => setSheet('payments')}
            />
          </View>

          {/* Support */}
          <View style={s.card}>
            <MenuRow
              icon="shield"
              label="Support"
              last
              onPress={() => setSheet('support')}
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </TabScreenEnter>

      <ProfileSheet
        visible={sheet === 'profile'}
        profile={profile}
        onClose={closeSheets}
        onSave={(p) => {
          setProfile(p);
          setTravellers((list) => syncSelfFromProfile(list, p));
          closeSheets();
        }}
      />

      <SpendHistorySheet
        visible={sheet === 'spend'}
        summary={summary}
        topRoutes={routes}
        onClose={closeSheets}
        onOpenTrip={(pnr) => {
          closeSheets();
          router.push({ pathname: '/itinerary', params: { pnr } });
        }}
      />

      <TravellersListSheet
        visible={sheet === 'travellers'}
        travellers={travellers}
        onClose={closeSheets}
        onOpen={openTraveller}
        onAdd={openAddTraveller}
      />

      <TravellerSheet
        visible={sheet === 'traveller'}
        traveller={addingTraveller ? null : editTraveller}
        onClose={backOrClose}
        onSave={(t) => {
          setTravellers((list) => {
            const exists = list.some((x) => x.id === t.id);
            return exists ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t];
          });
          if (t.id === 'self') {
            setProfile((p) => ({
              ...p,
              name: t.name,
              passportNumber: t.passportNumber,
              nationality: t.nationality,
              passportExpiry: t.passportExpiry,
            }));
          }
          setSheet('travellers');
          setReturnTo(null);
          setAddingTraveller(false);
        }}
        onRemove={(id) => {
          setTravellers((list) => list.filter((t) => t.id !== id));
          setSheet('travellers');
          setReturnTo(null);
        }}
      />

      <AddressSheet
        visible={sheet === 'address'}
        address={address}
        onClose={closeSheets}
        onSave={(a) => {
          setAddress(a);
          closeSheets();
        }}
      />

      <PreferencesSheet
        visible={sheet === 'preferences'}
        prefs={prefs}
        homeAirportLabel={homeAirportLabel}
        onClose={closeSheets}
        onPickPref={(key) => {
          setReturnTo('preferences');
          setSheet(null);
          setPrefPicker(key);
        }}
        onHomeAirport={() => {
          setReturnTo('preferences');
          setSheet('homeAirport');
        }}
      />

      <NotificationsSheet
        visible={sheet === 'notifications'}
        notifs={notifs}
        onClose={closeSheets}
        onToggle={toggleNotif}
      />

      <DiscountsSheet
        visible={sheet === 'discounts'}
        onClose={closeSheets}
        onBrowseOffers={() => {
          closeSheets();
          router.push('/(tabs)/offers');
        }}
      />

      <CarbonSheet visible={sheet === 'carbon'} onClose={closeSheets} />

      <LoyaltySheet
        visible={sheet === 'loyalty'}
        linked={loyalty}
        onClose={closeSheets}
        onSave={(link) => {
          upsertLinkedLoyalty(link);
        }}
        onUnlink={(programId) => {
          unlinkLoyalty(programId);
        }}
      />

      <PaymentMethodsListSheet
        visible={sheet === 'payments'}
        methods={methods}
        onClose={closeSheets}
        onOpen={openPayment}
        onAdd={openAddPayment}
      />

      <PaymentMethodSheet
        visible={sheet === 'payment'}
        method={addingPayment ? null : editPayment}
        methods={methods}
        onClose={backOrClose}
        onSave={(pm) => {
          const normalised = { ...pm, detail: paymentMethodDetail(pm) };
          setMethods((list) => {
            const exists = list.some((x) => x.id === normalised.id);
            if (!exists) {
              const next = [...list, normalised];
              return normalised.primary ? withPrimary(next, normalised.id) : next;
            }
            return list.map((x) => (x.id === normalised.id ? normalised : x));
          });
          setSheet('payments');
          setReturnTo(null);
          setAddingPayment(false);
        }}
        onRemove={(id) => {
          setMethods((list) => {
            if (list.length <= 1) return list;
            const next = list.filter((m) => m.id !== id);
            if (!next.some((m) => m.primary) && next[0]) {
              return withPrimary(next, next[0].id);
            }
            return next;
          });
          setSheet('payments');
          setReturnTo(null);
        }}
        onSetPrimary={(id) => {
          setMethods((list) => withPrimary(list, id));
          setEditPayment((pm) => (pm ? { ...pm, primary: true } : pm));
        }}
      />

      <SupportMenuSheet
        visible={sheet === 'support'}
        onClose={closeSheets}
        onHelp={() => {
          setReturnTo('support');
          setSheet('help');
        }}
        onTerms={() => {
          setReturnTo('support');
          setSheet('terms');
        }}
        onSignOut={() => {
          setReturnTo('support');
          setSheet('signout');
        }}
      />

      <HelpCentreSheet
        visible={sheet === 'help'}
        onClose={backOrClose}
      />
      <TermsSheet visible={sheet === 'terms'} onClose={backOrClose} />
      <SignOutSheet
        visible={sheet === 'signout'}
        onClose={backOrClose}
        onConfirm={() => {
          closeSheets();
          router.replace('/onboarding');
        }}
      />

      <AirportSearchSheet
        visible={sheet === 'homeAirport'}
        selectedIata={prefs.homeAirport}
        title="Home airport"
        subtitle="Same search as Find flights — pick your usual origin"
        onClose={backOrClose}
        onSelect={(airport) => {
          updatePreferences({ homeAirport: airport.iata });
          setSheet('preferences');
          setReturnTo(null);
        }}
      />

      {prefPicker && (
        <PickerSheet
          visible
          title={PREF_META[prefPicker].label}
          options={
            prefPicker === 'currency' ? CURRENCIES : PREF_META[prefPicker].options
          }
          selected={prefs[prefPicker]}
          onClose={() => {
            setPrefPicker(null);
            if (returnTo) setSheet(returnTo);
            setReturnTo(null);
          }}
          onSelect={(v) => {
            updatePreferences({ [prefPicker]: v });
            setPrefPicker(null);
            setSheet(returnTo ?? 'preferences');
            setReturnTo(null);
          }}
        />
      )}
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
