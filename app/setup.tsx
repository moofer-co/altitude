import { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Input } from '../components/ui';
import { AirportSearchSheet } from '../components/AirportSearchSheet';
import { layout, palette, spacing, radii } from '../constants/tokens';
import { airports, allAirports } from '../data/airports';
import { updatePreferences, getPreferences } from '../data/account';
import { markSetupComplete, getSession } from '../lib/auth';
import type { Airport } from '../types';

type Step = 'welcome' | 'airport' | 'payment' | 'passenger' | 'done';

const STEPS: Step[] = ['welcome', 'airport', 'payment', 'passenger', 'done'];

function Tip({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={s.tip}>
      <View style={s.tipIcon}>
        <Feather name={icon} size={18} color={palette.primary600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
          {title}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function Setup() {
  const router = useRouter();
  const session = getSession();
  const [step, setStep] = useState<Step>('welcome');
  const [airportOpen, setAirportOpen] = useState(false);
  const [home, setHome] = useState<Airport | null>(() => {
    const code = getPreferences().homeAirport;
    return (
      airports.find((a) => a.iata === code) ??
      allAirports.find((a) => a.iata === code) ??
      null
    );
  });
  const [cardName, setCardName] = useState(session?.name ?? '');
  const [cardLast4, setCardLast4] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paxName, setPaxName] = useState('');
  const [paxRelation, setPaxRelation] = useState('');
  const [paxSaved, setPaxSaved] = useState(false);

  const index = STEPS.indexOf(step);

  const go = useCallback((next: Step) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(next);
  }, []);

  const finish = useCallback(() => {
    markSetupComplete();
    router.replace('/home');
  }, [router]);

  const homeLabel = useMemo(() => {
    if (!home) return 'Choose airport';
    return `${home.city} (${home.iata})`;
  }, [home]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <Pressable
          style={s.skip}
          onPress={finish}
          hitSlop={8}
          accessibilityLabel="Skip setup"
        >
          <Text variant="bodySmall" style={{ color: palette.primary600, fontWeight: '600' }}>
            Skip for now
          </Text>
        </Pressable>
      </View>

      <View style={s.progress}>
        {STEPS.map((id, i) => (
          <View
            key={id}
            style={[s.dot, i <= index && s.dotOn]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'welcome' && (
          <View style={s.block}>
            <Text variant="display">
              A few details,{'\n'}when you are ready
            </Text>
            <Text variant="body" color="textSecondary" style={s.lead}>
              Hello{session?.name ? `, ${session.name.split(' ')[0]}` : ''}. You
              can book right away — or add a couple of things now so checkout
              stays calm later.
            </Text>
            <Tip
              icon="zap"
              title="Quicker booking"
              body="Saved passengers and a payment method mean fewer last-minute edits at the gate of payment."
            />
            <Tip
              icon="map-pin"
              title="Smarter defaults"
              body="A home airport pre-fills where you fly from, so search starts one step ahead."
            />
            <Button
              label="Continue"
              onPress={() => go('airport')}
              rounded
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {step === 'airport' && (
          <View style={s.block}>
            <Text variant="h1">Home airport</Text>
            <Text variant="body" color="textSecondary" style={s.lead}>
              Where do you usually leave from? You can change this anytime in
              Account.
            </Text>
            <Pressable
              style={s.airportPick}
              onPress={() => setAirportOpen(true)}
            >
              <Feather name="map-pin" size={18} color={palette.primary600} />
              <Text
                variant="bodyMedium"
                style={{ flex: 1, color: home ? palette.gray900 : palette.gray400 }}
              >
                {homeLabel}
              </Text>
              <Feather name="chevron-down" size={18} color={palette.gray500} />
            </Pressable>
            <Tip
              icon="compass"
              title="Tip"
              body="Setting a home airport keeps Explore and search oriented around your city."
            />
            <View style={s.actions}>
              <Button
                label="Save and continue"
                onPress={() => {
                  if (home) updatePreferences({ homeAirport: home.iata });
                  go('payment');
                }}
                disabled={!home}
                rounded
              />
              <Pressable onPress={() => go('payment')} hitSlop={8}>
                <Text variant="bodySmall" color="textSecondary" align="center">
                  Skip
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'payment' && (
          <View style={s.block}>
            <Text variant="h1">Payment method</Text>
            <Text variant="caption" color="textTertiary" style={s.optional}>
              OPTIONAL
            </Text>
            <Text variant="body" color="textSecondary" style={s.lead}>
              Add a card label now, or leave it for later. We never store full
              card numbers in this demo — only a friendly nickname and last
              digits.
            </Text>
            <View style={s.form}>
              <Input
                label="Name on card"
                value={cardName}
                onChangeText={setCardName}
                placeholder="As printed on the card"
              />
              <Input
                label="Last 4 digits"
                value={cardLast4}
                onChangeText={(t) => setCardLast4(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="4821"
                maxLength={4}
              />
              <Input
                label="Expiry"
                value={cardExpiry}
                onChangeText={setCardExpiry}
                placeholder="MM/YY"
                maxLength={5}
              />
            </View>
            {paymentSaved && (
              <View style={s.saved}>
                <Feather name="check-circle" size={16} color={palette.success} />
                <Text variant="caption" style={{ color: palette.successDark }}>
                  Saved for faster checkout
                </Text>
              </View>
            )}
            <Tip
              icon="shield"
              title="Why add this?"
              body="For a better booking experience, save a payment mode before you fly. It saves time and avoids last-minute changes at pay."
            />
            <View style={s.actions}>
              <Button
                label={paymentSaved ? 'Continue' : 'Save and continue'}
                onPress={() => {
                  if (cardLast4.length === 4) setPaymentSaved(true);
                  go('passenger');
                }}
                rounded
              />
              <Pressable onPress={() => go('passenger')} hitSlop={8}>
                <Text variant="bodySmall" color="textSecondary" align="center">
                  Skip
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'passenger' && (
          <View style={s.block}>
            <Text variant="h1">Traveller</Text>
            <Text variant="caption" color="textTertiary" style={s.optional}>
              OPTIONAL
            </Text>
            <Text variant="body" color="textSecondary" style={s.lead}>
              Add someone you often fly with. You can fill passport details later
              in Account.
            </Text>
            <View style={s.form}>
              <Input
                label="Full name"
                value={paxName}
                onChangeText={setPaxName}
                placeholder="As on their ID"
              />
              <Input
                label="Relationship"
                value={paxRelation}
                onChangeText={setPaxRelation}
                placeholder="Partner, child, parent…"
              />
            </View>
            {paxSaved && (
              <View style={s.saved}>
                <Feather name="check-circle" size={16} color={palette.success} />
                <Text variant="caption" style={{ color: palette.successDark }}>
                  Traveller ready for the next booking
                </Text>
              </View>
            )}
            <Tip
              icon="users"
              title="Why add this?"
              body="Passenger details before booking keep check-in calm — less typing, fewer last-minute corrections."
            />
            <View style={s.actions}>
              <Button
                label={paxSaved ? 'Continue' : 'Save and continue'}
                onPress={() => {
                  if (paxName.trim().length > 2) setPaxSaved(true);
                  go('done');
                }}
                rounded
              />
              <Pressable onPress={() => go('done')} hitSlop={8}>
                <Text variant="bodySmall" color="textSecondary" align="center">
                  Skip
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'done' && (
          <View style={s.block}>
            <View style={s.doneIcon}>
              <Feather name="check" size={28} color={palette.white} />
            </View>
            <Text variant="display" align="center">
              You are set
            </Text>
            <Text
              variant="body"
              color="textSecondary"
              align="center"
              style={s.lead}
            >
              Explore destinations whenever you are ready. Anything you skipped
              can be added from Account before your next trip.
            </Text>
            <View style={s.summary}>
              <SummaryRow
                ok={!!home}
                label="Home airport"
                value={home ? `${home.city} (${home.iata})` : 'Not set'}
              />
              <SummaryRow
                ok={paymentSaved}
                label="Payment"
                value={paymentSaved ? `Card ···· ${cardLast4}` : 'Not set'}
              />
              <SummaryRow
                ok={paxSaved}
                label="Traveller"
                value={paxSaved ? paxName.trim() : 'Not set'}
              />
            </View>
            <Button
              label="Start exploring"
              onPress={finish}
              rounded
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
      </ScrollView>

      <AirportSearchSheet
        visible={airportOpen}
        selectedIata={home?.iata}
        title="Home airport"
        subtitle="Default origin for search"
        onClose={() => setAirportOpen(false)}
        onSelect={(airport) => {
          setHome(airport);
          updatePreferences({ homeAirport: airport.iata });
          setAirportOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function SummaryRow({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={s.summaryRow}>
      <Feather
        name={ok ? 'check-circle' : 'circle'}
        size={16}
        color={ok ? palette.success : palette.gray300}
      />
      <Text variant="bodySmall" color="textSecondary" style={{ width: 110 }}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ flex: 1, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
  },
  skip: { paddingVertical: spacing.sm },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.gray200,
  },
  dotOn: { backgroundColor: palette.primary500 },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  block: { flexGrow: 1 },
  lead: { marginTop: spacing.sm, marginBottom: spacing.lg },
  optional: { letterSpacing: 1, marginTop: spacing.xs },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: palette.primary50,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airportPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: palette.gray50,
  },
  form: { gap: spacing.md, marginBottom: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  summary: {
    gap: spacing.md,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
