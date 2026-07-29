import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Keyboard overlap height in px.
 * Uses the full keyboard frame — do not subtract safe-area here; callers
 * decide how to combine with insets (subtracting early under-lifts on Android).
 */
export function useKeyboardLift() {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, (e) => {
      setLift(Math.max(0, e.endCoordinates.height));
    });
    const hide = Keyboard.addListener(hideEvt, () => setLift(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return lift;
}
