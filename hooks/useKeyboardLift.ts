import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * How many px the keyboard overlaps the bottom of the window.
 * Uses both `height` and `window.height - screenY` and takes the max —
 * critical on Android edge-to-edge where one of the two is often short.
 */
export function useKeyboardLift() {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const winH = Dimensions.get('window').height;
      const fromHeight = e.endCoordinates.height ?? 0;
      const fromScreenY = winH - e.endCoordinates.screenY;
      setLift(Math.max(0, fromHeight, fromScreenY));
    };

    const show = Keyboard.addListener(showEvt, onShow);
    const hide = Keyboard.addListener(hideEvt, () => setLift(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return lift;
}

/** Bottom padding: keyboard height when open, otherwise the fallback (e.g. safe inset). */
export function useKeyboardBottomPad(fallback = 0) {
  const lift = useKeyboardLift();
  return lift > 0 ? lift : fallback;
}
