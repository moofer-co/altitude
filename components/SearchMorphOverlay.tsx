import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing, radii } from '../constants/tokens';

const { width: SW, height: SH } = Dimensions.get('window');

export type SearchBarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  from: SearchBarRect | null;
  onNavigate: () => void;
  onFinished: () => void;
};

/**
 * Premium search-bar → airport-search morph.
 * Uses native-driver transforms + opacity only (no layout thrash / jitter).
 */
export function SearchMorphOverlay({
  visible,
  from,
  onNavigate,
  onFinished,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const navigated = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!visible || !from) return;

    navigated.current = false;
    finished.current = false;
    progress.setValue(0);

    const navAt = setTimeout(() => {
      if (!navigated.current) {
        navigated.current = true;
        onNavigate();
      }
    }, 200);

    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished: ok }) => {
      if (ok && !finished.current) {
        finished.current = true;
        onFinished();
      }
    });

    return () => clearTimeout(navAt);
  }, [visible, from, onNavigate, onFinished, progress]);

  if (!visible || !from) return null;

  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;

  // Expand a white disc from the pill center to cover the screen
  const coverSize = Math.hypot(SW, SH) * 1.15;
  const coverScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(from.width, from.height) / coverSize, 1],
  });

  // Hold solid white through the stack fade, then dissolve to reveal
  const veilOpacity = progress.interpolate({
    inputRange: [0, 0.22, 0.45, 0.72, 1],
    outputRange: [0, 0.75, 1, 1, 0],
  });

  const pillOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.42],
    outputRange: [1, 1, 0],
  });

  const pillLift = progress.interpolate({
    inputRange: [0, 0.38],
    outputRange: [0, -8],
    extrapolate: 'clamp',
  });

  const pillScale = progress.interpolate({
    inputRange: [0, 0.32, 0.5],
    outputRange: [1, 1.04, 1.02],
    extrapolate: 'clamp',
  });

  const chromeOpacity = progress.interpolate({
    inputRange: [0, 0.16, 0.36],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Expanding white veil from pill center */}
        <Animated.View
          style={[
            styles.cover,
            {
              left: cx - coverSize / 2,
              top: cy - coverSize / 2,
              width: coverSize,
              height: coverSize,
              borderRadius: coverSize / 2,
              opacity: veilOpacity,
              transform: [{ scale: coverScale }],
            },
          ]}
        />

        {/* Floating clone of the search pill */}
        <Animated.View
          style={[
            styles.pill,
            {
              left: from.x,
              top: from.y,
              width: from.width,
              height: from.height,
              opacity: pillOpacity,
              transform: [{ translateY: pillLift }, { scale: pillScale }],
            },
          ]}
        >
          <Animated.View style={[styles.paxBtn, { opacity: chromeOpacity }]}>
            <Feather name="user" size={18} color={palette.primary500} />
          </Animated.View>

          <Animated.View style={[styles.field, { opacity: chromeOpacity }]}>
            <Feather name="search" size={18} color={palette.gray400} />
            <Text variant="body" color="textTertiary" style={{ flex: 1 }}>
              Where to next?
            </Text>
          </Animated.View>

          <Animated.View style={[styles.goBtn, { opacity: chromeOpacity }]}>
            <Feather name="arrow-right" size={18} color={palette.white} />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    backgroundColor: palette.white,
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.gray200,
    paddingLeft: 6,
    paddingRight: 6,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  paxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.primary200,
    shadowColor: palette.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  goBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
