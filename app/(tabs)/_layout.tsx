import { Easing } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { colors } from '../../constants/tokens';
import type { BottomTabSceneInterpolationProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

/** Dissolve + slight rise — mature app feel, bar stays put. */
function forDissolve({ current }: BottomTabSceneInterpolationProps) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
        extrapolate: 'clamp' as const,
      }),
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [12, 0, 12],
            extrapolate: 'clamp' as const,
          }),
        },
      ],
    },
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: 'fade',
        sceneStyleInterpolator: forDissolve,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 280,
            easing: Easing.out(Easing.cubic),
          },
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Explore' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="offers" options={{ title: 'Offers' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
