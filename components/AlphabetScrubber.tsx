import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { palette, radii, shadows } from '../constants/tokens';

/** Z→A — matches the airport list grouping. */
export const LETTERS_ZA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reverse();

const TRACK_W = 36;
const BUBBLE = 56;
const BASE_SIZE = 11;
const MAG_RADIUS = 2;

/**
 * Apple Contacts–style alphabet scrubber.
 * Uses the responder system (not PanResponder) so touches stay reliable
 * next to a scrolling list and under keyboard dismiss.
 */
export function AlphabetScrubber({
  activeLetters,
  onSelect,
  onScrubStart,
  letters = LETTERS_ZA,
}: {
  activeLetters: Set<string>;
  onSelect: (letter: string) => void;
  onScrubStart?: () => void;
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
      return Math.min(
        letters.length - 1,
        Math.floor((clamped / h) * letters.length),
      );
    },
    [letters.length],
  );

  const selectAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= letters.length) return;
      const letter = letters[index];
      setFocusIndex(index);
      animateScales(index, true);
      showBubble(index);
      if (index !== lastIndex.current) {
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

  const handleGrant = useCallback(
    (e: GestureResponderEvent) => {
      onScrubStart?.();
      setScrubbing(true);
      selectAt(indexFromY(e.nativeEvent.locationY));
    },
    [onScrubStart, selectAt, indexFromY],
  );

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      selectAt(indexFromY(e.nativeEvent.locationY));
    },
    [selectAt, indexFromY],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    heightRef.current = h;
    setHeight(h);
  };

  const focusLetter = focusIndex >= 0 ? letters[focusIndex] : null;

  return (
    <View style={styles.wrap}>
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
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={endScrub}
        onResponderTerminate={endScrub}
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
                pointerEvents="none"
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
    flex: 1,
    width: TRACK_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: TRACK_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  trackActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
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
    right: TRACK_W + 2,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    ...shadows.floating,
  },
  bubbleLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.white,
    includeFontPadding: false,
  },
});
