import { useState, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { layout, palette, spacing, radii, typography } from '../../../constants/tokens';
import {
  getSavedAddress,
  setSavedAddress,
  subscribeSavedAddress,
  validateAddress,
  type SavedAddress,
} from '../../../data/account';

export default function AddressPage() {
  const [draft, setDraft] = useState<SavedAddress>(getSavedAddress);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return subscribeSavedAddress(() => {
      setDraft(getSavedAddress());
    });
  }, []);

  const errors = touched ? validateAddress(draft) : {};

  return (
    <AccountSubpage
      title="Saved address"
      subtitle="Used for billing and receipts"
      footer={
        <View style={s.footer}>
          <Pressable
            style={s.save}
            onPress={() => {
              setTouched(true);
              if (Object.keys(validateAddress(draft)).length) return;
              setSavedAddress(draft);
              setSaved(true);
            }}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {saved ? 'Saved' : 'Save address'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <Field
        label="Label"
        error={errors.label}
        value={draft.label}
        onChange={(label) => {
          setSaved(false);
          setDraft((d) => ({ ...d, label }));
        }}
        placeholder="Home, Work…"
      />
      <Field
        label="Address line 1"
        error={errors.line1}
        value={draft.line1}
        onChange={(line1) => {
          setSaved(false);
          setDraft((d) => ({ ...d, line1 }));
        }}
      />
      <Field
        label="Address line 2"
        value={draft.line2}
        onChange={(line2) => {
          setSaved(false);
          setDraft((d) => ({ ...d, line2 }));
        }}
        placeholder="Optional"
      />
      <Field
        label="City"
        error={errors.city}
        value={draft.city}
        onChange={(city) => {
          setSaved(false);
          setDraft((d) => ({ ...d, city }));
        }}
      />
      <Field
        label="State / region"
        value={draft.state}
        onChange={(state) => {
          setSaved(false);
          setDraft((d) => ({ ...d, state }));
        }}
      />
      <Field
        label="PIN / ZIP"
        error={errors.pincode}
        value={draft.pincode}
        onChange={(pincode) => {
          setSaved(false);
          setDraft((d) => ({ ...d, pincode }));
        }}
        keyboardType="number-pad"
      />
      <Field
        label="Country"
        value={draft.country}
        onChange={(country) => {
          setSaved(false);
          setDraft((d) => ({ ...d, country }));
        }}
      />
    </AccountSubpage>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={s.labelRow}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        {error ? (
          <Text variant="caption" style={{ color: palette.error }}>
            {error}
          </Text>
        ) : null}
      </View>
      <TextInput
        style={[s.input, error && s.inputErr]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.gray400}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const s = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: typography.body.fontSize,
    color: palette.gray900,
  },
  inputErr: { borderColor: palette.error },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: palette.gray50,
  },
  save: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
