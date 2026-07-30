import { Stack } from 'expo-router';
import { colors } from '../../../constants/tokens';

/**
 * Account hub + child settings pages. Add/edit forms stay as sheets
 * opened from these pages — not nested sheet stacks.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="passengers" />
      <Stack.Screen name="address" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="discounts" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="spend" />
      <Stack.Screen name="carbon" />
      <Stack.Screen name="support" />
      <Stack.Screen name="loyalty" />
    </Stack>
  );
}
