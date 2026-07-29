import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/tokens';

/** Always boot into the Dev Menu, not the last previewed screen. */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        {/* Tab shell: fade in from auth; bar lives inside and never slides */}
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: 'fade',
          }}
        />
        {/* Instant handoff — home morph owns the transition */}
        <Stack.Screen
          name="airport-search"
          options={{
            animation: 'none',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
