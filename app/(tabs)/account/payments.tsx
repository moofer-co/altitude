import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { PaymentMethodSheet } from '../../../components/AccountSheets';
import { palette, spacing, radii } from '../../../constants/tokens';
import {
  getPaymentMethods,
  upsertPaymentMethod,
  removePaymentMethod,
  setPrimaryPaymentMethod,
  subscribePaymentMethods,
  type PaymentMethod,
} from '../../../data/account';

export default function PaymentsPage() {
  const [methods, setMethods] = useState(getPaymentMethods);
  const [edit, setEdit] = useState<PaymentMethod | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(
    () => subscribePaymentMethods(() => setMethods(getPaymentMethods())),
    [],
  );

  return (
    <AccountSubpage
      title="Payment methods"
      subtitle="Cards and UPI used at checkout"
    >
      <View style={s.card}>
        {methods.map((pm, i) => (
          <Pressable
            key={pm.id}
            style={[s.row, i === methods.length - 1 && s.rowLast]}
            onPress={() => {
              setEdit(pm);
              setAdding(false);
            }}
          >
            <View style={s.icon}>
              <Feather
                name={pm.kind === 'upi' ? 'smartphone' : 'credit-card'}
                size={17}
                color={palette.gray700}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="bodyMedium">{pm.label}</Text>
                {pm.primary && (
                  <View style={s.primaryTag}>
                    <Text
                      variant="caption"
                      style={{ color: palette.primary700, fontWeight: '600' }}
                    >
                      Primary
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="caption" color="textTertiary">
                {pm.detail}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.gray400} />
          </Pressable>
        ))}
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
          Add a payment method
        </Text>
      </Pressable>

      <PaymentMethodSheet
        visible={adding || edit !== null}
        method={adding ? null : edit}
        methods={methods}
        onClose={() => {
          setAdding(false);
          setEdit(null);
        }}
        onSave={(pm) => {
          upsertPaymentMethod(pm);
          setAdding(false);
          setEdit(null);
        }}
        onRemove={(id) => {
          removePaymentMethod(id);
          setAdding(false);
          setEdit(null);
        }}
        onSetPrimary={(id) => {
          setPrimaryPaymentMethod(id);
          setEdit((pm) => (pm ? { ...pm, primary: true } : pm));
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
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTag: {
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.xs,
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
