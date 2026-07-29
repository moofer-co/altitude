import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from './ui';
import { palette, spacing } from '../constants/tokens';
import type { WeatherKind, WeatherSnapshot } from '../data/weather';

/**
 * Compact weather glyph — sunny / cloudy / rain / etc.
 * Used on the home greeting and on location cards (icon-only).
 */
export function WeatherIcon({
  kind,
  size = 22,
}: {
  kind: WeatherKind;
  size?: number;
}) {
  const sun = Math.round(size * 0.42);
  const drop = Math.round(size * 0.28);

  if (kind === 'sunny') {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <View
          style={[
            styles.sun,
            {
              width: sun + 4,
              height: sun + 4,
              borderRadius: (sun + 4) / 2,
              backgroundColor: '#FBBF24',
            },
          ]}
        />
      </View>
    );
  }

  if (kind === 'partlyCloudy' || kind === 'cloudy') {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        {kind === 'partlyCloudy' && (
          <View
            style={[
              styles.sunPeek,
              {
                width: sun,
                height: sun,
                borderRadius: sun / 2,
                right: 1,
                top: 1,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.cloud,
            {
              width: size * 0.72,
              height: size * 0.42,
              borderRadius: size * 0.22,
              bottom: kind === 'partlyCloudy' ? 1 : size * 0.18,
            },
          ]}
        />
      </View>
    );
  }

  if (kind === 'rain' || kind === 'storm') {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <View
          style={[
            styles.cloud,
            {
              width: size * 0.7,
              height: size * 0.38,
              borderRadius: size * 0.2,
              top: 1,
              backgroundColor: kind === 'storm' ? '#64748B' : '#93C5FD',
            },
          ]}
        />
        <View style={[styles.drops, { bottom: 0 }]}>
          <View style={[styles.drop, { width: 2, height: drop, marginHorizontal: 2 }]} />
          <View
            style={[styles.drop, { width: 2, height: drop - 2, marginHorizontal: 2 }]}
          />
          <View style={[styles.drop, { width: 2, height: drop, marginHorizontal: 2 }]} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, justifyContent: 'center', gap: 3 },
      ]}
    >
      <View style={[styles.fogLine, { width: size * 0.7 }]} />
      <View style={[styles.fogLine, { width: size * 0.55 }]} />
      <View style={[styles.fogLine, { width: size * 0.65 }]} />
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
      <WeatherIcon kind={weather.kind} size={26} />
      <Text variant="bodyMedium" style={styles.temp}>
        {weather.tempC}
      </Text>
      <Text variant="bodySmall" color="textSecondary">
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

/** Tiny icon for location / airport rows. */
export function WeatherBadge({
  weather,
  size = 20,
}: {
  weather: WeatherSnapshot;
  size?: number;
}) {
  return (
    <View style={[styles.badge, { width: size + 4, height: size + 4 }]}>
      <WeatherIcon kind={weather.kind} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: {
    shadowColor: '#FBBF24',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  sunPeek: {
    position: 'absolute',
    backgroundColor: '#FBBF24',
  },
  cloud: {
    position: 'absolute',
    backgroundColor: '#7DD3FC',
  },
  drops: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  drop: {
    backgroundColor: '#38BDF8',
    borderRadius: 1,
  },
  fogLine: {
    height: 2.5,
    borderRadius: 2,
    backgroundColor: palette.gray300,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  temp: {
    fontWeight: '700',
    color: palette.gray900,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
