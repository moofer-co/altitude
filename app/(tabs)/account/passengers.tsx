import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { TravellerSheet } from '../../../components/AccountSheets';
import { palette, spacing, radii } from '../../../constants/tokens';
import {
  getTravellers,
  upsertTraveller,
  removeTraveller,
  subscribeTravellers,
  documentNeedsAttention,
  updateProfile,
  type SavedTraveller,
} from '../../../data/account';

export default function PassengersPage() {
  const [travellers, setTravellers] = useState(getTravellers);
  const [edit, setEdit] = useState<SavedTraveller | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => subscribeTravellers(() => setTravellers(getTravellers())), []);

  return (
    <AccountSubpage
      title="Passengers list"
      subtitle="People you travel with"
    >
      <View style={s.card}>
        {travellers.map((t, i) => {
          const attention = documentNeedsAttention(t);
          return (
            <Pressable
              key={t.id}
              style={[s.row, i === travellers.length - 1 && s.rowLast]}
              onPress={() => {
                setEdit(t);
                setAdding(false);
              }}
            >
              <View style={s.mark}>
                <Text
                  variant="bodySmall"
                  style={{ color: palette.gray700, fontWeight: '700' }}
                >
                  {t.name.charAt(0) || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{t.name}</Text>
                <Text variant="caption" color="textTertiary">
                  {t.relationship}
                  {t.type !== 'adult' ? ` · ${t.type}` : ''}
                </Text>
              </View>
              {attention ? (
                <Feather name="alert-circle" size={16} color={palette.warningDark} />
              ) : (
                <Feather name="chevron-right" size={18} color={palette.gray400} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={s.add}
        onPress={() => {
          setEdit(null);
          setAdding(true);
        }}
      >
        <Feather name="plus" size={17} color={palette.primary600} />
        <Text
          variant="bodySmall"
          style={{ color: palette.primary600, fontWeight: '600' }}
        >
          Add a passenger
        </Text>
      </Pressable>

      <TravellerSheet
        visible={adding || edit !== null}
        traveller={adding ? null : edit}
        onClose={() => {
          setAdding(false);
          setEdit(null);
        }}
        onSave={(t) => {
          upsertTraveller(t);
          if (t.id === 'self') {
            updateProfile({
              name: t.name,
              passportNumber: t.passportNumber,
              nationality: t.nationality,
              passportExpiry: t.passportExpiry,
            });
          }
          setAdding(false);
          setEdit(null);
        }}
        onRemove={(id) => {
          removeTraveller(id);
          setAdding(false);
          setEdit(null);
        }}
      />
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
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  rowLast: { borderBottomWidth: 0 },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 48,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
  },
});
