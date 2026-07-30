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

const { height: SH } = Dimensions.get('window');

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
 * Home → airport-search handoff (window Modal for correct coords).
 * Soft white veil (no radial expand) + pill drifts up, then instant navigate.
 * Veil stays solid until unmount so home never flashes back.
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
    }, 340);

    Animated.timing(progress, {
      toValue: 1,
      duration: 620,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished: ok }) => {
      if (ok && !finished.current) {
        finished.current = true;
        setTimeout(onFinished, 60);
      }
    });

    return () => clearTimeout(navAt);
  }, [visible, from, onNavigate, onFinished, progress]);

  if (!visible || !from) return null;

  const exitY = -(from.y * 0.55 + 40);

  const veilOpacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });

  const pillY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min(exitY, -SH * 0.12)],
  });

  const pillScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const pillOpacity = progress.interpolate({
    inputRange: [0, 0.5, 0.78],
    outputRange: [1, 0.75, 0],
  });

  const chromeOpacity = progress.interpolate({
    inputRange: [0, 0.35, 0.6],
    outputRange: [1, 0.35, 0],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.root} pointerEvents="none">
        <Animated.View style={[styles.veil, { opacity: veilOpacity }]} />

        <Animated.View
          style={[
            styles.pill,
            {
              left: from.x,
              top: from.y,
              width: from.width,
              height: from.height,
              opacity: pillOpacity,
              transform: [{ translateY: pillY }, { scale: pillScale }],
            },
          ]}
        >
          <Animated.View style={[styles.paxGhost, { opacity: chromeOpacity }]}>
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
  root: {
    flex: 1,
  },
  veil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.white,
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingLeft: 6,
    paddingRight: 6,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  paxGhost: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.primary200,
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
