import { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import {
  validateMemberNumber,
  programById,
  seedBalanceFor,
  emptyAirlineLink,
  type LinkedLoyalty,
  type LoyaltyProgram,
} from '../data/loyalty';

/**
 * Add / edit a loyalty programme — opened as a sheet from the Loyalty page.
 */
export function LinkLoyaltySheet({
  visible,
  link,
  program,
  onClose,
  onSave,
  onUnlink,
}: {
  visible: boolean;
  /** Existing link when editing; null when adding */
  link: LinkedLoyalty | null;
  /** Required when adding a new programme */
  program?: LoyaltyProgram | null;
  onClose: () => void;
  onSave: (link: LinkedLoyalty) => void;
  onUnlink?: (programId: string) => void;
}) {
  const resolved =
    program ?? (link ? programById(link.programId) : null) ?? null;
  const isEdit = !!link;

  const [draft, setDraft] = useState<LinkedLoyalty | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (link) {
      setDraft({ ...link });
    } else if (resolved) {
      setDraft({
        ...emptyAirlineLink(resolved.id),
        points: seedBalanceFor(resolved.id),
      });
    } else {
      setDraft(null);
    }
    setError(null);
  }, [visible, link, resolved?.id]);

  const save = () => {
    if (!draft || !resolved) return;
    const err = validateMemberNumber(resolved, draft.memberNumber);
    if (err) {
      setError(err);
      return;
    }
    onSave({
      ...draft,
      memberNumber: draft.memberNumber.trim().toUpperCase(),
      points: draft.points || seedBalanceFor(draft.programId),
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        isEdit
          ? resolved?.programName ?? 'Membership'
          : `Link ${resolved?.programName ?? 'programme'}`
      }
      subtitle={resolved?.memberHint}
      heightRatio={0.72}
      footer={
        <View style={s.footer}>
          {isEdit && resolved?.kind === 'airline' && onUnlink && (
            <Pressable
              style={s.remove}
              onPress={() => {
                onUnlink(draft!.programId);
              }}
            >
              <Feather name="trash-2" size={17} color={palette.error} />
            </Pressable>
          )}
          <Pressable style={s.save} onPress={save}>
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {isEdit ? 'Save' : 'Link programme'}
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
        automaticallyAdjustKeyboardInsets
      >
        {resolved && (
          <View style={[s.programChip, { backgroundColor: resolved.color + '18' }]}>
            <View style={[s.mark, { backgroundColor: resolved.color }]}>
              <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                {resolved.airlineCode ?? 'A'}
              </Text>
            </View>
            <View>
              <Text variant="bodyMedium">{resolved.airlineName}</Text>
              <Text variant="caption" color="textTertiary">
                {resolved.programName}
              </Text>
            </View>
          </View>
        )}

        <Text variant="caption" color="textSecondary" style={{ marginBottom: 7 }}>
          Membership number
        </Text>
        <TextInput
          style={[s.input, error && s.inputError]}
          value={draft?.memberNumber ?? ''}
          onChangeText={(v) => {
            setDraft((d) => (d ? { ...d, memberNumber: v } : d));
            setError(null);
          }}
          placeholder={resolved?.memberHint ?? 'Membership number'}
          placeholderTextColor={palette.gray400}
          selectionColor={palette.primary500}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {error && (
          <Text variant="caption" style={{ color: palette.error, marginTop: 6 }}>
            {error}
          </Text>
        )}

        {isEdit && (
          <View style={{ marginTop: spacing.lg }}>
            <Text variant="caption" color="textSecondary" style={{ marginBottom: 7 }}>
              Points balance
            </Text>
            <TextInput
              style={s.input}
              value={String(draft?.points ?? 0)}
              onChangeText={(v) =>
                setDraft((d) =>
                  d
                    ? { ...d, points: Number(v.replace(/\D/g, '').slice(0, 7)) || 0 }
                    : d,
                )
              }
              keyboardType="number-pad"
              selectionColor={palette.primary500}
            />
            <Text variant="caption" color="textTertiary" style={{ marginTop: 6 }}>
              Balances sync from the airline in production. Editable here for demo.
            </Text>
          </View>
        )}

        {resolved?.kind === 'airline' && (
          <View style={s.note}>
            <Feather name="info" size={14} color={palette.gray500} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              These points redeem only when you book a {resolved.airlineName} flight.
              Altitude Rewards still apply on top for bookings made here.
            </Text>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

/** @deprecated Use LinkLoyaltySheet — list lives on the Loyalty page. */
export const LoyaltySheet = LinkLoyaltySheet;

/** Compact summary card for the Account screen. */
export function LoyaltySummary({
  linked,
  onPress,
}: {
  linked: LinkedLoyalty[];
  onPress: () => void;
}) {
  const altitude = linked.find((l) => l.programId === 'altitude');
  const airlines = linked.filter((l) => l.programId !== 'altitude');

  return (
    <Pressable style={s.summary} onPress={onPress}>
      <View style={[s.heroMark, { backgroundColor: palette.primary500 }]}>
        <Feather name="award" size={18} color={palette.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">Loyalty</Text>
        <Text variant="caption" color="textTertiary">
          {altitude
            ? `${altitude.points.toLocaleString()} Altitude pts`
            : 'Altitude Rewards'}
          {airlines.length > 0
            ? ` · ${airlines.length} airline${airlines.length > 1 ? 's' : ''}`
            : ' · link airlines'}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.gray400} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: typography.body.fontSize,
    color: palette.gray900,
    backgroundColor: palette.white,
  },
  inputError: { borderColor: palette.error },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remove: {
    width: 48,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.errorLight,
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
