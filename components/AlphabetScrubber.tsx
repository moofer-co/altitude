import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { palette, radii } from '../constants/tokens';

/** Z→A — matches the airport list grouping. */
export const LETTERS_ZA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reverse();

const TRACK_W = 28;
const BUBBLE = 52;
const BASE_SIZE = 11;

/**
 * Apple Contacts–style alphabet scrubber.
 * Single floating lens bubble, positioned with layout `top` beside the
 * focused letter (no transform drift / ghost duplicate).
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
  const [bubbleTop, setBubbleTop] = useState(0);
  const lastIndex = useRef(-1);
  const heightRef = useRef(0);
  const trackTopRef = useRef(0);

  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  const indexFromY = useCallback(
    (yInTrack: number) => {
      const h = heightRef.current;
      if (h <= 0) return -1;
      const clamped = Math.max(0, Math.min(h - 1, yInTrack));
      return Math.min(
        letters.length - 1,
        Math.floor((clamped / h) * letters.length),
      );
    },
    [letters.length],
  );

  const placeBubble = useCallback(
    (index: number) => {
      const h = heightRef.current;
      if (h <= 0 || index < 0) return;
      const slot = h / letters.length;
      const center = trackTopRef.current + index * slot + slot / 2;
      setBubbleTop(center - BUBBLE / 2);
    },
    [letters.length],
  );

  const showBubble = useCallback(() => {
    Animated.timing(bubbleOpacity, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [bubbleOpacity]);

  const hideBubble = useCallback(() => {
    Animated.timing(bubbleOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [bubbleOpacity]);

  const selectAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= letters.length) return;
      const letter = letters[index];
      setFocusIndex(index);
      placeBubble(index);
      showBubble();
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        if (activeLetters.has(letter)) onSelect(letter);
      }
    },
    [letters, placeBubble, showBubble, activeLetters, onSelect],
  );

  const endScrub = useCallback(() => {
    setScrubbing(false);
    setFocusIndex(-1);
    lastIndex.current = -1;
    hideBubble();
  }, [hideBubble]);

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

  const onTrackLayout = (e: LayoutChangeEvent) => {
    heightRef.current = e.nativeEvent.layout.height;
    trackTopRef.current = e.nativeEvent.layout.y;
    setHeight(e.nativeEvent.layout.height);
  };

  const focusLetter = focusIndex >= 0 ? letters[focusIndex] : null;

  return (
    <View style={styles.wrap} collapsable={false}>
      {scrubbing && focusLetter != null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              top: bubbleTop,
              opacity: bubbleOpacity,
            },
          ]}
        >
          <Text style={styles.bubbleLetter}>{focusLetter}</Text>
        </Animated.View>
      )}

      <View
        collapsable={false}
        style={[styles.track, scrubbing && styles.trackActive]}
        onLayout={onTrackLayout}
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

            return (
              <View
                key={letter}
                pointerEvents="none"
                style={[styles.slot, { height: height / letters.length }]}
              >
                <Text
                  style={[
                    styles.letter,
                    !present && styles.letterAbsent,
                    present && styles.letterPresent,
                    focused && styles.letterFocus,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
      </View>
    </View>
  );
}

export const SCRUBBER_SLOT_W = TRACK_W + BUBBLE + 8;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: TRACK_W + BUBBLE + 8,
    alignItems: 'flex-end',
  },
  track: {
    width: TRACK_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  letterFocus: {
    color: palette.primary700,
    fontWeight: '800',
  },
  bubble: {
    position: 'absolute',
    left: 0,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  bubbleLetter: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.white,
    includeFontPadding: false,
  },
});
