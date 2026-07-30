import { View, StyleSheet } from 'react-native';
import { Sheet } from './ui';
import { DateSelectPicker } from './DateSelectPicker';

/**
 * Full date-select experience (price range, cheapest dates, calendar)
 * as a bottom sheet — used by multi-city after picking a city.
 * Single-date only (one date per sector).
 */
export function DateSelectSheet({
  visible,
  selected,
  minDate,
  title = 'Select date',
  confirmLabel = 'Continue',
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: string | null;
  minDate?: string | null;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} heightRatio={0.92}>
      <View style={styles.body}>
        <DateSelectPicker
          embedded
          allowReturn={false}
          initialDate={selected}
          minDate={minDate}
          confirmLabel={confirmLabel}
          onConfirm={({ depart }) => {
            onSelect(depart);
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
