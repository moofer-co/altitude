import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui';
import { AccountSubpage } from '../../../components/AccountSubpage';
import { LinkLoyaltySheet } from '../../../components/LoyaltySheets';
import { palette, spacing, radii } from '../../../constants/tokens';
import {
  getLinkedLoyalty,
  subscribeLoyalty,
  upsertLinkedLoyalty,
  unlinkLoyalty,
  availableAirlinePrograms,
  programById,
  type LinkedLoyalty,
  type LoyaltyProgram,
} from '../../../data/loyalty';

export default function LoyaltyPage() {
  const [linked, setLinked] = useState(getLinkedLoyalty);
  const [edit, setEdit] = useState<LinkedLoyalty | null>(null);
  const [addProgram, setAddProgram] = useState<LoyaltyProgram | null>(null);

  useEffect(() => subscribeLoyalty(() => setLinked(getLinkedLoyalty())), []);

  const altitude = linked.find((l) => l.programId === 'altitude');
  const airlines = linked.filter((l) => l.programId !== 'altitude');
  const available = availableAirlinePrograms(linked);

  return (
    <AccountSubpage
      title="Loyalty"
      subtitle="Altitude Rewards and airline programmes"
    >
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
        programmes only redeem when you fly that airline.
      </Text>

      <Text variant="label" color="textTertiary" style={s.section}>
        AIRLINE PROGRAMMES
      </Text>

      {airlines.length === 0 && (
        <Text variant="bodySmall" color="textTertiary" style={{ marginBottom: spacing.md }}>
          No airline programmes linked yet.
        </Text>
      )}

      {airlines.map((link) => {
        const p = programById(link.programId);
        if (!p) return null;
        return (
          <Pressable
            key={link.programId}
            style={s.row}
            onPress={() => {
              setAddProgram(null);
              setEdit(link);
            }}
          >
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
            <Pressable
              key={p.id}
              style={s.row}
              onPress={() => {
                setEdit(null);
                setAddProgram(p);
              }}
            >
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

      <LinkLoyaltySheet
        visible={edit !== null || addProgram !== null}
        link={edit}
        program={addProgram}
        onClose={() => {
          setEdit(null);
          setAddProgram(null);
        }}
        onSave={(link) => {
          upsertLinkedLoyalty(link);
          setEdit(null);
          setAddProgram(null);
        }}
        onUnlink={(programId) => {
          unlinkLoyalty(programId);
          setEdit(null);
          setAddProgram(null);
        }}
      />
    </AccountSubpage>
  );
}

const s = StyleSheet.create({
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
});
