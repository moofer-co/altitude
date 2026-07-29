import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        {/* Fade pairs with the home search morph — no slide jitter */}
        <Stack.Screen
          name="airport-search"
          options={{
            animation: 'fade',
            animationDuration: 280,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
