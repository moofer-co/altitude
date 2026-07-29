import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing } from '../constants/tokens';
import type { WeatherKind, WeatherSnapshot } from '../data/weather';

const ICON: Record<
  WeatherKind,
  { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string }
> = {
  sunny: { name: 'weather-sunny', color: '#F59E0B' },
  partlyCloudy: { name: 'weather-partly-cloudy', color: '#38BDF8' },
  cloudy: { name: 'weather-cloudy', color: '#60A5FA' },
  rain: { name: 'weather-rainy', color: '#0EA5E9' },
  storm: { name: 'weather-lightning-rainy', color: '#64748B' },
  fog: { name: 'weather-fog', color: '#94A3B8' },
};

/**
 * Proper weather glyph (Sunny / Cloudy / Raining / …).
 */
export function WeatherIcon({
  kind,
  size = 22,
}: {
  kind: WeatherKind;
  size?: number;
}) {
  const { name, color } = ICON[kind];
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

/** Home greeting weather: icon + temp + label. */
export function WeatherPill({
  weather,
  style,
  onPress,
}: {
  weather: WeatherSnapshot;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const body = (
    <>
      <WeatherIcon kind={weather.kind} size={24} />
      <Text variant="bodyMedium" style={styles.temp}>
        {weather.tempC}
      </Text>
      <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
        {weather.label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.pill, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${weather.tempC} degrees, ${weather.label}`}
        hitSlop={4}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.pill, style]}
      accessibilityLabel={`${weather.tempC} degrees, ${weather.label}`}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    flexShrink: 0,
  },
  temp: {
    fontWeight: '700',
    color: palette.gray900,
    fontVariant: ['tabular-nums'],
  },
});
