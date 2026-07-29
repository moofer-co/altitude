import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Extra bottom inset while the software keyboard is visible.
 * Keeps a bottom search field above the keyboard on iOS and Android.
 */
export function useKeyboardLift() {
  const insets = useSafeAreaInsets();
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, (e) => {
      // Keyboard frame already includes the system nav area on many devices —
      // subtract the safe-area bottom so we don't double-pad.
      setLift(Math.max(0, e.endCoordinates.height - insets.bottom));
    });
    const hide = Keyboard.addListener(hideEvt, () => setLift(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, [insets.bottom]);

  return lift;
}
