import { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { PickerSheet } from './PickerSheet';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import { NATIONALITIES } from '../data/trip';
import {
  validateProfile,
  validateTraveller,
  validatePaymentMethod,
  paymentMethodDetail,
  emptyTraveller,
  emptyPaymentMethod,
  maskDate,
  maskCardExpiry,
  spendHistory,
  spendByYear,
  helpArticles,
  helpCategories,
  termsSections,
  SUPPORT_CONTACT,
  RELATIONSHIPS,
  SEAT_OPTIONS,
  MEAL_OPTIONS,
  type Profile,
  type SavedTraveller,
  type PaymentMethod,
  type SpendEntry,
  type HelpArticle,
} from '../data/account';

// ═══════════════════════════════════════════════════════════
// Shared form bits
// ═══════════════════════════════════════════════════════════

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

function FieldAlert({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={s.alert}>
      <Feather name="alert-circle" size={15} color={palette.errorDark} />
      <Text variant="caption" style={{ color: palette.errorDark, flex: 1 }}>
        {count === 1
          ? 'One field needs attention'
          : `${count} fields need attention`}
      </Text>
    </View>
  );
}

function SaveFooter({
  label,
  onPress,
  onRemove,
  removeDisabled,
}: {
  label: string;
  onPress: () => void;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  return (
    <View style={s.footer}>
      {onRemove && (
        <Pressable
          style={[s.remove, removeDisabled && { opacity: 0.35 }]}
          onPress={onRemove}
          disabled={removeDisabled}
          hitSlop={6}
        >
          <Feather name="trash-2" size={17} color={palette.error} />
        </Pressable>
      )}
      <Pressable style={s.save} onPress={onPress}>
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Profile
// ═══════════════════════════════════════════════════════════

export function ProfileSheet({
  visible,
  profile,
  onClose,
  onSave,
}: {
  visible: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [natOpen, setNatOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(profile);
    setTouched(new Set());
    setSubmitted(false);
  }, [visible, profile]);

  const errors = useMemo(() => validateProfile(draft), [draft]);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const touch = (f: string) => setTouched((t) => new Set(t).add(f));
  const show = (f: string) =>
    (submitted || touched.has(f)) && (errors as Record<string, string>)[f];

  const handleSave = () => {
    setSubmitted(true);
    if (Object.keys(errors).length === 0) onSave(draft);
  };

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Your profile"
        subtitle="Used to prefill bookings and contact you about trips"
        heightRatio={0.92}
        footer={<SaveFooter label="Save profile" onPress={handleSave} />}
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <FieldAlert count={Object.keys(errors).length} />

          <Label text="Full name" error={show('name') ? errors.name : undefined} />
          <TextInput
            style={[s.input, show('name') && s.inputError]}
            value={draft.name}
            onChangeText={(v) => set('name', v)}
            onBlur={() => touch('name')}
            placeholder="As on photo ID"
            placeholderTextColor={palette.gray400}
            selectionColor={palette.primary500}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <View style={{ marginTop: spacing.md }}>
            <Label text="Email" error={show('email') ? errors.email : undefined} />
            <TextInput
              style={[s.input, show('email') && s.inputError]}
              value={draft.email}
              onChangeText={(v) => set('email', v)}
              onBlur={() => touch('email')}
              placeholder="you@example.com"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Label text="Phone" error={show('phone') ? errors.phone : undefined} />
            <TextInput
              style={[s.input, show('phone') && s.inputError]}
              value={draft.phone}
              onChangeText={(v) => set('phone', v)}
              onBlur={() => touch('phone')}
              placeholder="+91 98765 43210"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.divider} />
          <View style={s.sectionHead}>
            <Feather name="globe" size={15} color={palette.primary600} />
            <Text variant="bodyMedium" style={{ color: palette.primary700 }}>
              Travel document
            </Text>
          </View>
          <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
            Optional until an international booking. Saved for check-in prefills.
          </Text>

          <Label
            text="Passport number"
            error={show('passportNumber') ? errors.passportNumber : undefined}
          />
          <TextInput
            style={[s.input, show('passportNumber') && s.inputError]}
            value={draft.passportNumber ?? ''}
            onChangeText={(v) => set('passportNumber', v.toUpperCase() || null)}
            onBlur={() => touch('passportNumber')}
            placeholder="e.g. M1234567"
            placeholderTextColor={palette.gray400}
            selectionColor={palette.primary500}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />

          <View style={{ marginTop: spacing.md }}>
            <Label text="Nationality" />
            <Pressable style={[s.input, s.picker]} onPress={() => setNatOpen(true)}>
              <Text variant="body" style={{ flex: 1 }}>
                {draft.nationality}
              </Text>
              <Feather name="chevron-down" size={18} color={palette.gray500} />
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Label
              text="Passport expiry"
              error={show('passportExpiry') ? errors.passportExpiry : undefined}
            />
            <TextInput
              style={[s.input, show('passportExpiry') && s.inputError]}
              value={draft.passportExpiry ?? ''}
              onChangeText={(v) =>
                set('passportExpiry', maskDate(v, draft.passportExpiry ?? '') || null)
              }
              onBlur={() => touch('passportExpiry')}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <View style={s.note}>
            <Feather name="info" size={14} color={palette.gray500} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Member since {draft.memberSince}. Changing your name here updates the
              “You” traveller used on bookings.
            </Text>
          </View>
        </ScrollView>
      </Sheet>

      <PickerSheet
        visible={natOpen}
        title="Nationality"
        options={NATIONALITIES}
        selected={draft.nationality}
        searchable
        onClose={() => setNatOpen(false)}
        onSelect={(v) => set('nationality', v)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Traveller
// ═══════════════════════════════════════════════════════════

export function TravellerSheet({
  visible,
  traveller,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean;
  traveller: SavedTraveller | null;
  onClose: () => void;
  onSave: (t: SavedTraveller) => void;
  onRemove?: (id: string) => void;
}) {
  const isNew = traveller === null;
  const [draft, setDraft] = useState<SavedTraveller>(traveller ?? emptyTraveller());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [natOpen, setNatOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(traveller ?? emptyTraveller());
    setTouched(new Set());
    setSubmitted(false);
  }, [visible, traveller]);

  const isSelf = draft.id === 'self';
  const errors = useMemo(() => validateTraveller(draft), [draft]);
  const set = <K extends keyof SavedTraveller>(key: K, value: SavedTraveller[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const touch = (f: string) => setTouched((t) => new Set(t).add(f));
  const show = (f: string) =>
    (submitted || touched.has(f)) && (errors as Record<string, string>)[f];

  const handleSave = () => {
    setSubmitted(true);
    if (Object.keys(errors).length === 0) onSave(draft);
  };

  const types: Array<SavedTraveller['type']> = ['adult', 'child', 'infant'];

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={isNew ? 'Add traveller' : isSelf ? 'Your details' : 'Edit traveller'}
        subtitle="Passport and defaults carry into every booking"
        heightRatio={0.92}
        footer={
          <SaveFooter
            label={isNew ? 'Add traveller' : 'Save traveller'}
            onPress={handleSave}
            onRemove={
              !isNew && !isSelf && onRemove ? () => onRemove(draft.id) : undefined
            }
          />
        }
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <FieldAlert count={Object.keys(errors).length} />

          {!isSelf && (
            <>
              <Label text="Travelling as" />
              <View style={s.segments}>
                {types.map((t) => (
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
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ height: spacing.md }} />
            </>
          )}

          <Label text="Full name" error={show('name') ? errors.name : undefined} />
          <TextInput
            style={[s.input, show('name') && s.inputError]}
            value={draft.name}
            onChangeText={(v) => set('name', v)}
            onBlur={() => touch('name')}
            placeholder="As on photo ID"
            placeholderTextColor={palette.gray400}
            selectionColor={palette.primary500}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isSelf}
          />
          {isSelf && (
            <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
              Edit your name from Profile
            </Text>
          )}

          {!isSelf && (
            <View style={{ marginTop: spacing.md }}>
              <Label
                text="Relationship"
                error={show('relationship') ? errors.relationship : undefined}
              />
              <Pressable style={[s.input, s.picker]} onPress={() => setRelOpen(true)}>
                <Text variant="body" style={{ flex: 1 }}>
                  {draft.relationship}
                </Text>
                <Feather name="chevron-down" size={18} color={palette.gray500} />
              </Pressable>
            </View>
          )}

          {draft.type !== 'infant' && (
            <>
              <View style={s.divider} />
              <View style={s.sectionHead}>
                <Feather name="globe" size={15} color={palette.primary600} />
                <Text variant="bodyMedium" style={{ color: palette.primary700 }}>
                  Travel document
                </Text>
              </View>

              <Label
                text="Passport number"
                error={show('passportNumber') ? errors.passportNumber : undefined}
              />
              <TextInput
                style={[s.input, show('passportNumber') && s.inputError]}
                value={draft.passportNumber ?? ''}
                onChangeText={(v) => set('passportNumber', v.toUpperCase() || null)}
                onBlur={() => touch('passportNumber')}
                placeholder="e.g. M1234567"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
              />

              <View style={{ marginTop: spacing.md }}>
                <Label text="Nationality" />
                <Pressable style={[s.input, s.picker]} onPress={() => setNatOpen(true)}>
                  <Text variant="body" style={{ flex: 1 }}>
                    {draft.nationality}
                  </Text>
                  <Feather name="chevron-down" size={18} color={palette.gray500} />
                </Pressable>
              </View>

              <View style={{ marginTop: spacing.md }}>
                <Label
                  text="Passport expiry"
                  error={show('passportExpiry') ? errors.passportExpiry : undefined}
                />
                <TextInput
                  style={[s.input, show('passportExpiry') && s.inputError]}
                  value={draft.passportExpiry ?? ''}
                  onChangeText={(v) =>
                    set(
                      'passportExpiry',
                      maskDate(v, draft.passportExpiry ?? '') || null,
                    )
                  }
                  onBlur={() => touch('passportExpiry')}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </>
          )}

          <View style={s.divider} />
          <Text variant="bodyMedium" style={{ marginBottom: spacing.md }}>
            Booking defaults
          </Text>

          <Label text="Seat preference" />
          <Pressable style={[s.input, s.picker]} onPress={() => setSeatOpen(true)}>
            <Text
              variant="body"
              style={{ flex: 1, color: draft.seatPreference ? palette.gray900 : palette.gray400 }}
            >
              {draft.seatPreference ?? 'No preference'}
            </Text>
            <Feather name="chevron-down" size={18} color={palette.gray500} />
          </Pressable>

          <View style={{ marginTop: spacing.md }}>
            <Label text="Meal preference" />
            <Pressable style={[s.input, s.picker]} onPress={() => setMealOpen(true)}>
              <Text
                variant="body"
                style={{
                  flex: 1,
                  color: draft.mealPreference ? palette.gray900 : palette.gray400,
                }}
              >
                {draft.mealPreference ?? 'No preference'}
              </Text>
              <Feather name="chevron-down" size={18} color={palette.gray500} />
            </Pressable>
          </View>
        </ScrollView>
      </Sheet>

      <PickerSheet
        visible={natOpen}
        title="Nationality"
        options={NATIONALITIES}
        selected={draft.nationality}
        searchable
        onClose={() => setNatOpen(false)}
        onSelect={(v) => set('nationality', v)}
      />
      <PickerSheet
        visible={relOpen}
        title="Relationship"
        options={RELATIONSHIPS}
        selected={draft.relationship}
        onClose={() => setRelOpen(false)}
        onSelect={(v) => set('relationship', v)}
      />
      <PickerSheet
        visible={seatOpen}
        title="Seat preference"
        options={SEAT_OPTIONS}
        selected={draft.seatPreference ?? 'No preference'}
        onClose={() => setSeatOpen(false)}
        onSelect={(v) => set('seatPreference', v === 'No preference' ? null : v)}
      />
      <PickerSheet
        visible={mealOpen}
        title="Meal preference"
        options={MEAL_OPTIONS}
        selected={draft.mealPreference ?? 'No preference'}
        onClose={() => setMealOpen(false)}
        onSelect={(v) => set('mealPreference', v === 'No preference' ? null : v)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Spend history
// ═══════════════════════════════════════════════════════════

export function SpendHistorySheet({
  visible,
  onClose,
  onOpenTrip,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenTrip?: (pnr: string) => void;
}) {
  const entries = useMemo(() => spendHistory(), []);
  const byYear = useMemo(() => spendByYear(entries), [entries]);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setYearFilter('all');
      setOpenId(null);
    }
  }, [visible]);

  const filtered =
    yearFilter === 'all' ? entries : entries.filter((e) => e.year === yearFilter);
  const total =
    yearFilter === 'all'
      ? byYear.reduce((sum, y) => sum + y.total, 0)
      : byYear.find((y) => y.year === yearFilter)?.total ?? 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Spend history"
      subtitle="Every charge and refund across your trips"
      heightRatio={0.92}
    >
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            label="All"
            on={yearFilter === 'all'}
            onPress={() => setYearFilter('all')}
          />
          {byYear.map((y) => (
            <Chip
              key={y.year}
              label={String(y.year)}
              on={yearFilter === y.year}
              onPress={() => setYearFilter(y.year)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={s.spendTotal}>
        <Text variant="caption" color="textTertiary">
          {yearFilter === 'all' ? 'All time' : String(yearFilter)}
        </Text>
        <Text style={s.spendAmount}>₹{Math.max(0, total).toLocaleString()}</Text>
        <Text variant="caption" color="textTertiary">
          {filtered.length} payment{filtered.length === 1 ? '' : 's'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Feather name="inbox" size={28} color={palette.gray400} />
            <Text variant="bodySmall" color="textTertiary" align="center">
              No payments in this period
            </Text>
          </View>
        )}

        {filtered.map((entry) => (
          <SpendRow
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
            onOpenTrip={onOpenTrip}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.chip, on && s.chipOn]} onPress={onPress}>
      <Text
        variant="caption"
        style={{
          color: on ? palette.primary700 : palette.gray600,
          fontWeight: on ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SpendRow({
  entry,
  open,
  onToggle,
  onOpenTrip,
}: {
  entry: SpendEntry;
  open: boolean;
  onToggle: () => void;
  onOpenTrip?: (pnr: string) => void;
}) {
  const isRefund = entry.amount < 0 || entry.status === 'refunded';
  return (
    <View style={s.spendCard}>
      <Pressable style={s.spendRow} onPress={onToggle}>
        <View
          style={[
            s.spendMark,
            {
              backgroundColor: isRefund ? palette.warningLight : palette.successLight,
            },
          ]}
        >
          <Feather
            name={isRefund ? 'rotate-ccw' : 'check'}
            size={14}
            color={isRefund ? palette.warningDark : palette.successDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall">{entry.label}</Text>
          <Text variant="caption" color="textTertiary">
            {entry.route} · {entry.pnr} · {entry.dateLabel}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={{
            fontWeight: '600',
            color: isRefund ? palette.warningDark : palette.gray900,
          }}
        >
          {isRefund ? '−' : ''}₹{Math.abs(entry.amount).toLocaleString()}
        </Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={palette.gray400}
        />
      </Pressable>

      {open && (
        <View style={s.spendLines}>
          <Text variant="caption" color="textTertiary" style={{ marginBottom: 6 }}>
            {entry.method} · {entry.status}
          </Text>
          {entry.lines.map((ln) => (
            <View key={`${ln.label}-${ln.amount}`} style={s.lineRow}>
              <View style={{ flex: 1 }}>
                <Text variant="caption">{ln.label}</Text>
                {ln.note && (
                  <Text variant="caption" color="textTertiary">
                    {ln.note}
                  </Text>
                )}
              </View>
              <Text variant="caption">
                {ln.amount < 0 ? '−' : ''}₹{Math.abs(ln.amount).toLocaleString()}
              </Text>
            </View>
          ))}
          {onOpenTrip && (
            <Pressable
              style={s.tripLink}
              onPress={() => onOpenTrip(entry.pnr)}
            >
              <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                View trip {entry.pnr}
              </Text>
              <Feather name="arrow-right" size={14} color={palette.primary600} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Payment method
// ═══════════════════════════════════════════════════════════

export function PaymentMethodSheet({
  visible,
  method,
  methods,
  onClose,
  onSave,
  onRemove,
  onSetPrimary,
}: {
  visible: boolean;
  method: PaymentMethod | null;
  methods: PaymentMethod[];
  onClose: () => void;
  onSave: (pm: PaymentMethod) => void;
  onRemove?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
}) {
  const isNew = method === null;
  const [kind, setKind] = useState<'upi' | 'card'>(method?.kind ?? 'upi');
  const [draft, setDraft] = useState<PaymentMethod>(
    method ?? emptyPaymentMethod('upi'),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const seed = method ?? emptyPaymentMethod('upi');
    setKind(seed.kind);
    setDraft(seed);
    setTouched(new Set());
    setSubmitted(false);
  }, [visible, method]);

  const errors = useMemo(() => validatePaymentMethod(draft), [draft]);
  const touch = (f: string) => setTouched((t) => new Set(t).add(f));
  const show = (f: string) =>
    (submitted || touched.has(f)) && (errors as Record<string, string>)[f];

  const switchKind = (k: 'upi' | 'card') => {
    setKind(k);
    setDraft(emptyPaymentMethod(k));
    setTouched(new Set());
    setSubmitted(false);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const next: PaymentMethod = {
      ...draft,
      detail: paymentMethodDetail(draft),
      label:
        draft.kind === 'upi'
          ? 'UPI'
          : draft.label.trim() || `Card ending ${draft.last4}`,
      primary: isNew ? methods.length === 0 : draft.primary,
    };
    onSave(next);
  };

  const onlyOne = methods.length <= 1;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isNew ? 'Add payment method' : 'Payment method'}
      subtitle="Details are stored for checkout — full card numbers stay with the provider"
      heightRatio={0.86}
      footer={
        <SaveFooter
          label={isNew ? 'Add method' : 'Save method'}
          onPress={handleSave}
          onRemove={
            !isNew && onRemove ? () => onRemove(draft.id) : undefined
          }
          removeDisabled={!isNew && onlyOne}
        />
      }
    >
      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
      >
        <FieldAlert count={Object.keys(errors).length} />

        {isNew && (
          <>
            <Label text="Type" />
            <View style={s.segments}>
              {(['upi', 'card'] as const).map((k) => (
                <Pressable
                  key={k}
                  style={[s.segment, kind === k && s.segmentOn]}
                  onPress={() => switchKind(k)}
                >
                  <Text
                    variant="bodySmall"
                    align="center"
                    style={{
                      color: kind === k ? palette.white : palette.gray700,
                      fontWeight: kind === k ? '600' : '400',
                    }}
                  >
                    {k === 'upi' ? 'UPI' : 'Card'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: spacing.md }} />
          </>
        )}

        {draft.kind === 'upi' ? (
          <>
            <Label text="UPI ID" error={show('vpa') ? errors.vpa : undefined} />
            <TextInput
              style={[s.input, show('vpa') && s.inputError]}
              value={draft.vpa ?? ''}
              onChangeText={(v) => setDraft((d) => ({ ...d, vpa: v.toLowerCase() }))}
              onBlur={() => touch('vpa')}
              placeholder="name@bank"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        ) : (
          <>
            <Label text="Card name" error={show('label') ? errors.label : undefined} />
            <TextInput
              style={[s.input, show('label') && s.inputError]}
              value={draft.label}
              onChangeText={(v) => setDraft((d) => ({ ...d, label: v }))}
              onBlur={() => touch('label')}
              placeholder="e.g. HDFC Credit Card"
              placeholderTextColor={palette.gray400}
              selectionColor={palette.primary500}
              autoCapitalize="words"
            />

            <View style={s.nameRow}>
              <View style={{ flex: 1 }}>
                <Label
                  text="Last 4 digits"
                  error={show('last4') ? errors.last4 : undefined}
                />
                <TextInput
                  style={[s.input, show('last4') && s.inputError]}
                  value={draft.last4 ?? ''}
                  onChangeText={(v) =>
                    setDraft((d) => ({ ...d, last4: v.replace(/\D/g, '').slice(0, 4) }))
                  }
                  onBlur={() => touch('last4')}
                  placeholder="4821"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label
                  text="Expiry"
                  error={show('expiry') ? errors.expiry : undefined}
                />
                <TextInput
                  style={[s.input, show('expiry') && s.inputError]}
                  value={draft.expiry ?? ''}
                  onChangeText={(v) =>
                    setDraft((d) => ({
                      ...d,
                      expiry: maskCardExpiry(v, d.expiry ?? ''),
                    }))
                  }
                  onBlur={() => touch('expiry')}
                  placeholder="MM/YY"
                  placeholderTextColor={palette.gray400}
                  selectionColor={palette.primary500}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>
          </>
        )}

        {!isNew && onSetPrimary && (
          <Pressable
            style={[s.primaryBtn, draft.primary && s.primaryBtnOn]}
            onPress={() => {
              if (!draft.primary) onSetPrimary(draft.id);
            }}
            disabled={draft.primary}
          >
            <Feather
              name={draft.primary ? 'check-circle' : 'circle'}
              size={18}
              color={draft.primary ? palette.primary600 : palette.gray500}
            />
            <Text
              variant="bodySmall"
              style={{
                color: draft.primary ? palette.primary700 : palette.gray700,
                fontWeight: '600',
              }}
            >
              {draft.primary ? 'Primary method' : 'Make primary'}
            </Text>
          </Pressable>
        )}

        {!isNew && onlyOne && (
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.md }}>
            Keep at least one payment method on the account.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Help centre
// ═══════════════════════════════════════════════════════════

export function HelpCentreSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<(typeof helpCategories)[number]>('All');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory('All');
      setOpenId(null);
    }
  }, [visible]);

  const articles =
    category === 'All'
      ? helpArticles
      : helpArticles.filter((a) => a.category === category);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Help centre"
      subtitle="Answers drawn from how bookings and trips actually work"
      heightRatio={0.92}
    >
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {helpCategories.map((c) => (
            <Chip
              key={c}
              label={c}
              on={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.contactCard}>
          <Text variant="bodyMedium">Need a person?</Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {SUPPORT_CONTACT.hours}
          </Text>
          <View style={s.contactActions}>
            <Pressable
              style={s.contactBtn}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_CONTACT.email}`)}
            >
              <Feather name="mail" size={16} color={palette.primary600} />
              <Text variant="caption" style={{ color: palette.primary700, fontWeight: '600' }}>
                Email
              </Text>
            </Pressable>
            <Pressable
              style={s.contactBtn}
              onPress={() =>
                Linking.openURL(`tel:${SUPPORT_CONTACT.phone.replace(/\s/g, '')}`)
              }
            >
              <Feather name="phone" size={16} color={palette.primary600} />
              <Text variant="caption" style={{ color: palette.primary700, fontWeight: '600' }}>
                Call
              </Text>
            </Pressable>
          </View>
        </View>

        {articles.map((a) => (
          <HelpRow
            key={a.id}
            article={a}
            open={openId === a.id}
            onToggle={() => setOpenId(openId === a.id ? null : a.id)}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

function HelpRow({
  article,
  open,
  onToggle,
}: {
  article: HelpArticle;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={s.helpCard}>
      <Pressable style={s.helpHead} onPress={onToggle}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="textTertiary">
            {article.category.toUpperCase()}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 2 }}>
            {article.title}
          </Text>
        </View>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.gray400}
        />
      </Pressable>
      {open && (
        <Text variant="caption" color="textSecondary" style={s.helpBody}>
          {article.body}
        </Text>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Terms
// ═══════════════════════════════════════════════════════════

export function TermsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Terms and privacy"
      subtitle="How Altitude handles bookings and your data"
      heightRatio={0.9}
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {termsSections.map((sec) => (
          <View key={sec.title} style={{ marginBottom: spacing.lg }}>
            <Text variant="bodyMedium" style={{ marginBottom: spacing.sm }}>
              {sec.title}
            </Text>
            {sec.paragraphs.map((p) => (
              <Text
                key={p.slice(0, 24)}
                variant="bodySmall"
                color="textSecondary"
                style={{ marginBottom: spacing.sm, lineHeight: 22 }}
              >
                {p}
              </Text>
            ))}
          </View>
        ))}
        <Text variant="caption" color="textTertiary">
          Last updated July 2026
        </Text>
      </ScrollView>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Sign out
// ═══════════════════════════════════════════════════════════

export function SignOutSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sign out?"
      subtitle="Saved travellers and preferences stay on this device until you clear app data"
      heightRatio={0.42}
      footer={
        <View style={s.signOutFooter}>
          <Pressable style={s.ghost} onPress={onClose}>
            <Text variant="bodyMedium" color="textSecondary">
              Stay signed in
            </Text>
          </Pressable>
          <Pressable style={s.danger} onPress={onConfirm}>
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              Sign out
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={s.body}>
        <View style={s.signOutNote}>
          <Feather name="log-out" size={20} color={palette.error} />
          <Text variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
            You will return to the welcome screen. Open trips and bookings are still
            yours — sign back in with the same email to continue.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const s = StyleSheet.create({
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

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

  input: {
    ...typography.body,
    color: palette.gray900,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.white,
  },
  inputError: { borderColor: palette.error },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
  },

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
  segmentOn: {
    backgroundColor: palette.primary500,
    borderColor: palette.primary500,
  },

  nameRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginVertical: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.md,
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remove: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.errorLight,
    backgroundColor: palette.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterBar: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: palette.gray100,
    marginRight: spacing.sm,
  },
  chipOn: { backgroundColor: palette.primary50 },

  spendTotal: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  spendAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.gray900,
    lineHeight: 34,
  },

  spendCard: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  spendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
  },
  spendMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendLines: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
    backgroundColor: palette.gray50,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  tripLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },

  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  primaryBtnOn: {
    borderColor: palette.primary200,
    backgroundColor: palette.primary50,
  },

  contactCard: {
    backgroundColor: palette.primary50,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
  },

  helpCard: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  helpHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
  },
  helpBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },

  signOutFooter: { gap: spacing.sm },
  ghost: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: palette.errorLight,
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
