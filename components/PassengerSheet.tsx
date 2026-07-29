import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { PickerSheet } from './PickerSheet';
import { palette, spacing, radii, typography } from '../constants/tokens';
import {
  validatePassenger,
  PASSENGER_LABEL,
  PASSENGER_HINT,
  type Passenger,
  type PassengerType,
  type Title,
  type Gender,
} from '../data/booking';
import {
  validateDocument,
  NATIONALITIES,
  type TravelDocument,
} from '../data/trip';

const TITLES: Title[] = ['Mr', 'Ms', 'Mrs'];
const GENDERS: Array<{ id: Gender; label: string }> = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];
const TYPES: PassengerType[] = ['adult', 'child', 'infant'];

function maskDate(raw: string, previous: string): string {
  const deleting = raw.length < previous.length;
  if (deleting && raw.endsWith('/')) return raw.slice(0, -1);
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join('/');
}

export function PassengerSheet({
  visible,
  passenger,
  index,
  international,
  departISO,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean;
  passenger: Passenger | null;
  index: number;
  international: boolean;
  departISO: string;
  onClose: () => void;
  onSave: (p: Passenger, doc: TravelDocument | null) => void;
  onRemove?: (id: string) => void;
}) {
  // All hooks run unconditionally, before any early return
  const [draft, setDraft] = useState<Passenger | null>(passenger);
  const [doc, setDoc] = useState<TravelDocument | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [natOpen, setNatOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(passenger);
    setDoc(
      international
        ? {
            passengerId: passenger?.id ?? '',
            passportNumber: '',
            nationality: 'Indian',
            issuingCountry: 'India',
            expiry: '',
          }
        : null,
    );
    setTouched(new Set());
    setSubmitted(false);
  }, [visible, passenger, international]);

  const errors = useMemo(() => (draft ? validatePassenger(draft) : {}), [draft]);
  const docErrors = useMemo(
    () => (doc ? validateDocument(doc, departISO) : {}),
    [doc, departISO],
  );

  if (!draft) return null;

  const set = <K extends keyof Passenger>(key: K, value: Passenger[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setDocField = (field: keyof TravelDocument, value: string) =>
    setDoc((d) => (d ? { ...d, [field]: value } : d));

  const touch = (field: string) => setTouched((t) => new Set(t).add(field));

  const show = (field: string) =>
    (submitted || touched.has(field)) &&
    ((errors as Record<string, string>)[field] ||
      (docErrors as Record<string, string>)[field]);

  const totalErrors =
    Object.keys(errors).length +
    (international ? Object.keys(docErrors).length : 0);

  const handleSave = () => {
    setSubmitted(true);
    if (totalErrors === 0) onSave(draft, doc);
  };

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={passenger?.firstName ? 'Edit passenger' : `Passenger ${index + 1}`}
        subtitle={
          international
            ? 'International flight · passport details required'
            : 'Names must match the photo ID used at the airport'
        }
        heightRatio={0.92}
        footer={
          <View style={s.footer}>
            {onRemove && (
              <Pressable style={s.remove} onPress={() => onRemove(draft.id)} hitSlop={6}>
                <Feather name="trash-2" size={17} color={palette.error} />
              </Pressable>
            )}
            <Pressable style={s.save} onPress={handleSave}>
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                Save passenger
              </Text>
            </Pressable>
          </View>
        }
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {submitted && totalErrors > 0 && (
            <View style={s.alert}>
              <Feather name="alert-circle" size={15} color={palette.errorDark} />
              <Text variant="caption" style={{ color: palette.errorDark, flex: 1 }}>
                {totalErrors === 1
                  ? 'One field needs attention'
                  : `${totalErrors} fields need attention`}
              </Text>
            </View>
          )}

          {/* Type */}
          <Label text="Travelling as" />
          <View style={s.segments}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                style={[s.segment, draft.type === t && s.segmentOn]}
                onPress={() => set('type', t)}
              >
                <Text
                  variant="bodySmall"
                  align="center"
                  style={{
                    color: draft.type === t ? palette.white : palette.gray700,
                    fontWeight: draft.type === t ? '600' : '400',
                  }}
                >
                  {PASSENGER_LABEL[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            variant="caption"
            color="textTertiary"
            style={{ marginTop: 4, marginBottom: spacing.md }}
          >
            {PASSENGER_HINT[draft.type]}
          </Text>

          {/* Title */}
          <Label text="Title" error={show('title') ? errors.title : undefined} />
          <View style={s.titleRow}>
            {TITLES.map((t) => {
              const on = draft.title === t;
              return (
                <Pressable
                  key={t}
                  style={[s.titlePill, on && s.titlePillOn]}
                  onPress={() => {
                    set('title', t);
                    touch('title');
                  }}
                >
                  <View style={[s.titleDot, on && s.titleDotOn]}>
                    {on && <View style={s.titleDotInner} />}
                  </View>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: on ? palette.primary700 : palette.gray700,
                      fontWeight: on ? '600' : '400',
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Names */}
          <View style={s.nameRow}>
            <View style={{ flex: 1 }}>
              <Label text="First name" error={show('firstName') ? errors.firstName : undefined} />
              <TextInput
                style={[s.input, show('firstName') && s.inputError]}
                value={draft.firstName}
                onChangeText={(v) => set('firstName', v)}
                onBlur={() => touch('firstName')}
                placeholder="As on ID"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Last name" error={show('lastName') ? errors.lastName : undefined} />
              <TextInput
                style={[s.input, show('lastName') && s.inputError]}
                value={draft.lastName}
                onChangeText={(v) => set('lastName', v)}
                onBlur={() => touch('lastName')}
                placeholder="Surname"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Gender */}
          <Label text="Gender" error={show('gender') ? errors.gender : undefined} />
          <View style={s.segments}>
            {GENDERS.map((g) => (
              <Pressable
                key={g.id}
                style={[s.segment, draft.gender === g.id && s.segmentOn]}
                onPress={() => {
                  set('gender', g.id);
                  touch('gender');
                }}
              >
                <Text
                  variant="bodySmall"
                  align="center"
                  style={{
                    color: draft.gender === g.id ? palette.white : palette.gray700,
                    fontWeight: draft.gender === g.id ? '600' : '400',
                  }}
                >
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* DOB */}
          <View style={{ marginTop: spacing.md }}>
            <Label
              text={draft.type === 'adult' ? 'Date of birth (optional)' : 'Date of birth'}
              error={show('dob') ? errors.dob : undefined}
            />
            <TextInput
              style={[s.input, show('dob') && s.inputError]}
              value={draft.dob ?? ''}
              onChangeText={(v) => set('dob', maskDate(v, draft.dob ?? ''))}
              onBlur={() => touch('dob')}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              keyboardType="number-pad"
              maxLength={10}
            />
            {draft.type !== 'adult' && !show('dob') && (
              <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                Airlines verify age at check-in for this fare
              </Text>
            )}
          </View>

          {/* Passport */}
          {international && doc && (
            <>
              <View style={s.divider} />
              <View style={s.passportHead}>
                <Feather name="globe" size={15} color={palette.primary600} />
                <Text variant="bodyMedium" style={{ color: palette.primary700 }}>
                  Travel document
                </Text>
              </View>
              <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
                Required for international flights. Must match the passport you carry.
              </Text>

              <Label
                text="Passport number"
                error={show('passportNumber') ? docErrors.passportNumber : undefined}
              />
              <TextInput
                style={[s.input, show('passportNumber') && s.inputError]}
                value={doc.passportNumber}
                onChangeText={(v) => setDocField('passportNumber', v.toUpperCase())}
                onBlur={() => touch('passportNumber')}
                placeholder="e.g. M1234567"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
              />

              <View style={{ marginTop: spacing.md }}>
                <Label
                  text="Nationality"
                  error={show('nationality') ? docErrors.nationality : undefined}
                />
                <Pressable
                  style={[s.input, s.picker]}
                  onPress={() => setNatOpen(true)}
                >
                  <Text variant="body" style={{ flex: 1 }}>
                    {doc.nationality}
                  </Text>
                  <Feather name="chevron-down" size={18} color={palette.gray500} />
                </Pressable>
              </View>

              <View style={{ marginTop: spacing.md }}>
                <Label
                  text="Passport expiry"
                  error={show('expiry') ? docErrors.expiry : undefined}
                />
                <TextInput
                  style={[s.input, show('expiry') && s.inputError]}
                  value={doc.expiry}
                  onChangeText={(v) => setDocField('expiry', maskDate(v, doc.expiry))}
                  onBlur={() => touch('expiry')}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </>
          )}

          <View style={s.note}>
            <Feather name="info" size={14} color={palette.gray500} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {international
                ? 'Passport details are shared with border authorities before departure. Changes after booking carry a fee.'
                : 'A name that does not match your ID can mean being refused boarding, and changes after booking carry a fee.'}
            </Text>
          </View>
        </ScrollView>
      </Sheet>

      <PickerSheet
        visible={natOpen}
        title="Nationality"
        options={NATIONALITIES}
        selected={doc?.nationality ?? ''}
        searchable
        onClose={() => setNatOpen(false)}
        onSelect={(v) => {
          setDocField('nationality', v);
          touch('nationality');
        }}
      />
    </>
  );
}

function Label({ text, error }: { text: string; error?: string }) {
  return (
    <View style={s.labelRow}>
      <Text variant="caption" color="textSecondary">
        {text}
      </Text>
      {error && (
        <View style={s.errorInline}>
          <Feather name="alert-circle" size={12} color={palette.error} />
          <Text variant="caption" style={{ color: palette.error }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.errorLight,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  errorInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
  },
  segmentOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  titleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  titlePillOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  titleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleDotOn: { borderColor: palette.primary500 },
  titleDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.primary500 },

  nameRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },

  input: {
    ...typography.body,
    color: palette.gray900,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
  },
  inputError: { borderColor: palette.error },
  picker: { flexDirection: 'row', alignItems: 'center' },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginVertical: spacing.xl,
  },
  passportHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.xl,
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  remove: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: palette.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    flex: 1,
    minHeight: 52,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
