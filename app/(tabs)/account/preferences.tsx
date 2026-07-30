import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { PickerSheet } from '../../../components/PickerSheet';
import { AirportSearchSheet } from '../../../components/AirportSearchSheet';
import { palette, spacing, radii } from '../../../constants/tokens';
import { airports } from '../../../data/airports';
import {
  getPreferences,
  updatePreferences,
  subscribePreferences,
  PREF_META,
  CURRENCIES,
  type Preferences,
  type PrefKey,
} from '../../../data/account';

type PrefPickerKey = Exclude<PrefKey, 'homeAirport'>;

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences>(getPreferences);
  const [picker, setPicker] = useState<PrefPickerKey | null>(null);
  const [airportOpen, setAirportOpen] = useState(false);

  useEffect(() => subscribePreferences(() => setPrefs(getPreferences())), []);

  const homeLabel = (() => {
    const a = airports.find((x) => x.iata === prefs.homeAirport);
    return a ? `${a.iata} · ${a.city}` : prefs.homeAirport;
  })();

  return (
    <AccountSubpage
      title="Travel preferences"
      subtitle="Defaults applied when you search and book"
    >
      <View style={s.card}>
        <PrefRow
          icon="grid"
          label="Seat"
          value={prefs.seat}
          onPress={() => setPicker('seat')}
        />
        <PrefRow
          icon="coffee"
          label="Meal"
          value={prefs.meal}
          onPress={() => setPicker('meal')}
        />
        <PrefRow
          icon="map-pin"
          label="Home airport"
          value={homeLabel}
          onPress={() => setAirportOpen(true)}
        />
        <PrefRow
          icon="dollar-sign"
          label="Currency"
          value={prefs.currency}
          last
          onPress={() => setPicker('currency')}
        />
      </View>

      {picker && (
        <PickerSheet
          visible
          title={PREF_META[picker].label}
          options={
            picker === 'currency' ? CURRENCIES : PREF_META[picker].options
          }
          selected={prefs[picker]}
          onClose={() => setPicker(null)}
          onSelect={(v) => {
            updatePreferences({ [picker]: v });
            setPicker(null);
          }}
        />
      )}

      <AirportSearchSheet
        visible={airportOpen}
        selectedIata={prefs.homeAirport}
        title="Home airport"
        subtitle="Pick your usual origin"
        onClose={() => setAirportOpen(false)}
        onSelect={(airport) => {
          updatePreferences({ homeAirport: airport.iata });
          setAirportOpen(false);
        }}
      />
    </AccountSubpage>
  );
}

function PrefRow({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.row, last && s.rowLast]} onPress={onPress}>
      <View style={s.icon}>
        <Feather name={icon as never} size={16} color={palette.gray600} />
      </View>
      <Text variant="bodySmall" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
        {value}
      </Text>
      <Feather name="chevron-right" size={18} color={palette.gray400} />
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
