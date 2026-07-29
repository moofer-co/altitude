import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '../components/ui';
import { OnboardingOrbit } from '../components/OnboardingOrbit';
import { palette, spacing } from '../constants/tokens';

const { width: SW } = Dimensions.get('window');
const ORBIT = Math.min(SW * 0.82, 340);

export default function Onboarding() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.illustration}>
          <OnboardingOrbit size={ORBIT} />
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fade, transform: [{ translateY: rise }] },
          ]}
        >
          <Text variant="display" align="center">
            It's all about you{'\n'}and your journey
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            align="center"
            style={styles.subtitle}
          >
            Everything revolves around you — destinations, flights, and the
            little details of the trip.
          </Text>
        </Animated.View>

        <Button
          label="Get started"
          onPress={() => router.replace('/home')}
          rounded
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cta: {
    marginBottom: spacing.md,
  },
});
