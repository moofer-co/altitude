import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateSelectPicker } from '../components/DateSelectPicker';
import { PageEnter } from '../components/TabScreenEnter';
import { palette } from '../constants/tokens';
import { getPreferences } from '../data/account';
import { airports, allAirports } from '../data/airports';
import {
  serializeSearchLegs,
  type SearchLeg,
} from '../data/multiCity';

function resolveAirport(iata: string) {
  return (
    airports.find((a) => a.iata === iata) ??
    allAirports.find((a) => a.iata === iata) ??
    null
  );
}

export default function DateSelect() {
  const router = useRouter();
  const { to, city } = useLocalSearchParams<{ to?: string; city?: string }>();

  const destIata = to ?? 'BLR';
  const destCity = city ?? 'Bengaluru';
  const dest = resolveAirport(destIata);
  const originIata = getPreferences().homeAirport;
  const origin = resolveAirport(originIata);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <PageEnter variant="dates" backgroundColor={palette.white}>
        <DateSelectPicker
          allowReturn
          confirmLabel="Continue"
          onConfirm={({ depart, returnDate }) => {
            if (returnDate && origin) {
              // Round trip → dedicated multi-leg recommendations
              const legs: SearchLeg[] = [
                {
                  id: `out-${depart}`,
                  from: origin.iata,
                  to: dest?.iata ?? destIata,
                  fromCity: origin.city,
                  toCity: dest?.city ?? destCity,
                  date: depart,
                },
                {
                  id: `ret-${returnDate}`,
                  from: dest?.iata ?? destIata,
                  to: origin.iata,
                  fromCity: dest?.city ?? destCity,
                  toCity: origin.city,
                  date: returnDate,
                },
              ];
              router.push({
                pathname: '/flights-multi',
                params: { legs: serializeSearchLegs(legs) },
              });
              return;
            }

            // One-way → existing flight recommendations
            router.push({
              pathname: '/flights',
              params: {
                to: destIata,
                city: destCity,
                depart,
              },
            });
          }}
          onClose={() => {
            if (router.canGoBack()) router.back();
          }}
        />
      </PageEnter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.white,
  },
});
