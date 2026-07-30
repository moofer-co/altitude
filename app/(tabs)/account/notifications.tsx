import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { palette, spacing, radii } from '../../../constants/tokens';
import {
  getNotifications,
  toggleNotification,
  subscribeNotifications,
  type NotificationSetting,
} from '../../../data/account';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<NotificationSetting[]>(getNotifications);

  useEffect(
    () => subscribeNotifications(() => setNotifs(getNotifications())),
    [],
  );

  return (
    <AccountSubpage
      title="Notifications"
      subtitle="Choose what reaches you"
    >
      <View style={s.card}>
        {notifs.map((n, i) => (
          <View
            key={n.id}
            style={[s.row, i === notifs.length - 1 && s.rowLast]}
          >
            <View style={{ flex: 1 }}>
              <View style={s.titleRow}>
                <Text variant="bodySmall">{n.title}</Text>
                <View style={s.channel}>
                  <Feather
                    name={n.channel === 'push' ? 'smartphone' : 'mail'}
                    size={10}
                    color={palette.gray500}
                  />
                  <Text variant="caption" color="textTertiary">
                    {n.channel}
                  </Text>
                </View>
              </View>
              <Text variant="caption" color="textTertiary">
                {n.detail}
              </Text>
            </View>
            <Pressable
              style={[s.toggle, n.enabled && s.toggleOn]}
              onPress={() => toggleNotification(n.id)}
              hitSlop={6}
            >
              <View style={[s.knob, n.enabled && s.knobOn]} />
            </Pressable>
          </View>
        ))}
      </View>
    </AccountSubpage>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  rowLast: { borderBottomWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.gray50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray300,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: palette.primary500 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.white,
  },
  knobOn: { alignSelf: 'flex-end' },
});
