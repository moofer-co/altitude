import { View, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, colors, spacing } from '../../constants/tokens';

interface ScreenProps {
  /** Content anchors to bottom by default (thumb-first). Set 'top' for scrollable lists. */
  anchor?: 'bottom' | 'top';
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Screen({
  anchor = 'bottom',
  edges = ['top'],
  style,
  children,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View
        style={[
          styles.container,
          anchor === 'bottom' ? styles.anchorBottom : styles.anchorTop,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
  },
  anchorBottom: {
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxl,
  },
  anchorTop: {
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
  },
});
