import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DateSelectPicker } from '../components/DateSelectPicker';
import { palette } from '../constants/tokens';

export default function DateSelect() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DateSelectPicker
        confirmLabel="Continue"
        onConfirm={() => router.push('/flights')}
        onClose={() => {
          if (router.canGoBack()) router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.white,
  },
});
