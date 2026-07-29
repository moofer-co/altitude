import { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { palette, radii, shadows } from '../constants/tokens';

/** Z→A — matches the airport list grouping. */
export const LETTERS_ZA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reverse();

const TRACK_W = 28;
const BUBBLE = 56;
const BASE_SIZE = 11;
/** How many letters either side of the focus get fisheye scale. */
const MAG_RADIUS = 2;

/**
 * Apple Contacts–style alphabet scrubber.
 *
 * Drag (or tap) along the index: the focused letter zooms with a soft
 * fisheye on its neighbours, and a floating lens bubble shows which letter
 * you are on. Used by airport search and the home-airport sheet alike.
 */
export function AlphabetScrubber({
  activeLetters,
  onSelect,
  letters = LETTERS_ZA,
}: {
  activeLetters: Set<string>;
  onSelect: (letter: string) => void;
  letters?: string[];
}) {
  const [height, setHeight] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const lastIndex = useRef(-1);
  const heightRef = useRef(0);

  const scales = useMemo(
    () => letters.map(() => new Animated.Value(1)),
    [letters],
  );

  const bubbleY = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  const animateScales = useCallback(
    (index: number, active: boolean) => {
      letters.forEach((_, i) => {
        let to = 1;
        if (active && index >= 0) {
          const dist = Math.abs(i - index);
          if (dist === 0) to = 1.85;
          else if (dist === 1) to = 1.35;
          else if (dist === 2) to = 1.12;
        }
        Animated.spring(scales[i], {
          toValue: to,
          useNativeDriver: true,
          tension: 420,
          friction: 22,
          overshootClamping: true,
        }).start();
      });
    },
    [letters, scales],
  );

  const showBubble = useCallback(
    (index: number) => {
      if (heightRef.current <= 0) return;
      const slot = heightRef.current / letters.length;
      const y = index * slot + slot / 2 - BUBBLE / 2;
      bubbleY.setValue(y);
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }).start();
    },
    [bubbleOpacity, bubbleY, letters.length],
  );

  const hideBubble = useCallback(() => {
    Animated.timing(bubbleOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [bubbleOpacity]);

  const indexFromY = useCallback(
    (y: number) => {
      const h = heightRef.current;
      if (h <= 0) return -1;
      const clamped = Math.max(0, Math.min(h - 1, y));
      return Math.min(letters.length - 1, Math.floor((clamped / h) * letters.length));
    },
    [letters.length],
  );

  const selectAt = useCallback(
    (index: number, announce: boolean) => {
      if (index < 0 || index >= letters.length) return;
      const letter = letters[index];
      setFocusIndex(index);
      animateScales(index, true);
      showBubble(index);
      if (announce && index !== lastIndex.current) {
        lastIndex.current = index;
        if (activeLetters.has(letter)) onSelect(letter);
      }
    },
    [letters, animateScales, showBubble, activeLetters, onSelect],
  );

  const endScrub = useCallback(() => {
    setScrubbing(false);
    setFocusIndex(-1);
    lastIndex.current = -1;
    animateScales(-1, false);
    hideBubble();
  }, [animateScales, hideBubble]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setScrubbing(true);
        const idx = indexFromY(e.nativeEvent.locationY);
        selectAt(idx, true);
      },
      onPanResponderMove: (e) => {
        const idx = indexFromY(e.nativeEvent.locationY);
        selectAt(idx, true);
      },
      onPanResponderRelease: endScrub,
      onPanResponderTerminate: endScrub,
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    heightRef.current = h;
    setHeight(h);
  };

  const focusLetter = focusIndex >= 0 ? letters[focusIndex] : null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* Floating lens — sits left of the index, Apple Contacts style */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            opacity: bubbleOpacity,
            transform: [{ translateY: bubbleY }],
          },
        ]}
      >
        <Text style={styles.bubbleLetter}>{focusLetter ?? ''}</Text>
      </Animated.View>

      <View
        style={[styles.track, scrubbing && styles.trackActive]}
        onLayout={onLayout}
        {...pan.panHandlers}
      >
        {height > 0 &&
          letters.map((letter, i) => {
            const present = activeLetters.has(letter);
            const focused = scrubbing && i === focusIndex;
            const near =
              scrubbing &&
              focusIndex >= 0 &&
              Math.abs(i - focusIndex) <= MAG_RADIUS &&
              i !== focusIndex;

            return (
              <Animated.View
                key={letter}
                style={[
                  styles.slot,
                  { height: height / letters.length },
                  { transform: [{ scale: scales[i] }] },
                ]}
              >
                <Text
                  style={[
                    styles.letter,
                    !present && styles.letterAbsent,
                    present && styles.letterPresent,
                    near && styles.letterNear,
                    focused && styles.letterFocus,
                  ]}
                >
                  {letter}
                </Text>
              </Animated.View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: TRACK_W,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  track: {
    width: TRACK_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  trackActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  slot: {
    width: TRACK_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: BASE_SIZE,
    lineHeight: BASE_SIZE + 2,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  letterPresent: {
    color: palette.primary600,
  },
  letterAbsent: {
    color: palette.gray300,
    fontWeight: '500',
  },
  letterNear: {
    color: palette.primary700,
  },
  letterFocus: {
    color: palette.primary700,
    fontWeight: '800',
  },
  bubble: {
    position: 'absolute',
    right: TRACK_W + 4,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  bubbleLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.white,
    includeFontPadding: false,
  },
});
