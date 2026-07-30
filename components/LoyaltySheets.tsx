import { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet } from './ui';
import { layout, palette, spacing, radii, typography } from '../constants/tokens';
import {
  availableAirlinePrograms,
  validateMemberNumber,
  programById,
  seedBalanceFor,
  emptyAirlineLink,
  type LinkedLoyalty,
  type LoyaltyProgram,
} from '../data/loyalty';

export function LoyaltySheet({
  visible,
  linked,
  onClose,
  onSave,
  onUnlink,
}: {
  visible: boolean;
  linked: LinkedLoyalty[];
  onClose: () => void;
  onSave: (link: LinkedLoyalty) => void;
  onUnlink: (programId: string) => void;
}) {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [draft, setDraft] = useState<LinkedLoyalty | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode('list');
      setDraft(null);
      setError(null);
    }
  }, [visible]);

  const altitude = linked.find((l) => l.programId === 'altitude');
  const airlines = linked.filter((l) => l.programId !== 'altitude');
  const available = availableAirlinePrograms(linked);

  const openAdd = (program: LoyaltyProgram) => {
    setDraft({ ...emptyAirlineLink(program.id), points: seedBalanceFor(program.id) });
    setError(null);
    setMode('add');
  };

  const openEdit = (link: LinkedLoyalty) => {
    setDraft({ ...link });
    setError(null);
    setMode('edit');
  };

  const program = draft ? programById(draft.programId) : null;

  const save = () => {
    if (!draft || !program) return;
    const err = validateMemberNumber(program, draft.memberNumber);
    if (err) {
      setError(err);
      return;
    }
    onSave({
      ...draft,
      memberNumber: draft.memberNumber.trim().toUpperCase(),
      points: draft.points || seedBalanceFor(draft.programId),
    });
    setMode('list');
    setDraft(null);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        mode === 'list'
          ? 'Loyalty'
          : mode === 'add'
            ? `Link ${program?.programName ?? 'programme'}`
            : program?.programName ?? 'Membership'
      }
      subtitle={
        mode === 'list'
          ? 'Altitude Rewards on every booking · airline points on matching flights'
          : program?.memberHint
      }
      heightRatio={0.9}
      footer={
        mode !== 'list' ? (
          <View style={s.footer}>
            {mode === 'edit' && program?.kind === 'airline' && (
              <Pressable
                style={s.remove}
                onPress={() => {
                  onUnlink(draft!.programId);
                  setMode('list');
                  setDraft(null);
                }}
              >
                <Feather name="trash-2" size={17} color={palette.error} />
              </Pressable>
            )}
            <Pressable style={s.save} onPress={save}>
              <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
                {mode === 'add' ? 'Link programme' : 'Save'}
              </Text>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {mode === 'list' ? (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* Platform */}
          {altitude && (
            <View style={[s.hero, { borderColor: palette.primary200 }]}>
              <View style={[s.heroMark, { backgroundColor: palette.primary500 }]}>
                <Feather name="award" size={20} color={palette.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                  PLATFORM
                </Text>
                <Text variant="h2">Altitude Rewards</Text>
                <Text variant="caption" color="textTertiary">
                  {altitude.memberNumber} · earns on every booking here
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.points}>{altitude.points.toLocaleString()}</Text>
                <Text variant="caption" color="textTertiary">
                  points
                </Text>
              </View>
            </View>
          )}

          <Text variant="caption" color="textTertiary" style={s.hint}>
            Redeem Altitude points on any flight booked through Altitude. Airline
            programmes only redeem when you fly that airline — IndiGo BluChip on
            IndiGo, and so on.
          </Text>

          <Text variant="label" color="textTertiary" style={s.section}>
            AIRLINE PROGRAMMES
          </Text>

          {airlines.length === 0 && (
            <Text variant="bodySmall" color="textTertiary" style={{ marginBottom: spacing.md }}>
              No airline programmes linked yet. Add IndiGo BluChip to redeem on
              IndiGo bookings.
            </Text>
          )}

          {airlines.map((link) => {
            const p = programById(link.programId);
            if (!p) return null;
            return (
              <Pressable key={link.programId} style={s.row} onPress={() => openEdit(link)}>
                <View style={[s.mark, { backgroundColor: p.color }]}>
                  <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                    {p.airlineCode}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{p.airlineName}</Text>
                  <Text variant="caption" color="textTertiary">
                    {p.programName} · {link.memberNumber}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyMedium">{link.points.toLocaleString()}</Text>
                  <Text variant="caption" color="textTertiary">
                    pts
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.gray400} />
              </Pressable>
            );
          })}

          {available.length > 0 && (
            <>
              <Text variant="label" color="textTertiary" style={s.section}>
                ADD A PROGRAMME
              </Text>
              {available.map((p) => (
                <Pressable key={p.id} style={s.row} onPress={() => openAdd(p)}>
                  <View style={[s.mark, { backgroundColor: p.color }]}>
                    <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                      {p.airlineCode}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{p.airlineName}</Text>
                    <Text variant="caption" color="textTertiary">
                      {p.programName}
                    </Text>
                  </View>
                  <Feather name="plus" size={18} color={palette.primary600} />
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          {program && (
            <View style={[s.programChip, { backgroundColor: program.color + '18' }]}>
              <View style={[s.mark, { backgroundColor: program.color }]}>
                <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
                  {program.airlineCode ?? 'A'}
                </Text>
              </View>
              <View>
                <Text variant="bodyMedium">{program.airlineName}</Text>
                <Text variant="caption" color="textTertiary">
                  {program.programName}
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
            placeholder={program?.memberHint ?? 'Membership number'}
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

          {mode === 'edit' && (
            <View style={{ marginTop: spacing.lg }}>
              <Text variant="caption" color="textSecondary" style={{ marginBottom: 7 }}>
                Points balance
              </Text>
              <TextInput
                style={s.input}
                value={String(draft?.points ?? 0)}
                onChangeText={(v) =>
                  setDraft((d) =>
                    d ? { ...d, points: Number(v.replace(/\D/g, '').slice(0, 7)) || 0 } : d,
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

          {program?.kind === 'airline' && (
            <View style={s.note}>
              <Feather name="info" size={14} color={palette.gray500} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                These points redeem only when you book a {program.airlineName} flight.
                Altitude Rewards still apply on top for bookings made here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Sheet>
  );
}

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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.primary50,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: { fontSize: 22, fontWeight: '700', color: palette.gray900 },
  hint: { marginBottom: spacing.lg, lineHeight: 18 },
  section: { letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 64,
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
    ...typography.body,
    color: palette.gray900,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
  },
  inputError: { borderColor: palette.error },
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
