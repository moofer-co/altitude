/**
 * Loyalty — airline programmes you link, plus Altitude Rewards earned on
 * every booking made through this platform.
 *
 * Redemption rule: an airline programme only pays down a booking marketed
 * by that airline (IndiGo BluChip → IndiGo flights). Altitude Rewards redeem
 * on any booking placed here.
 */

export type LoyaltyKind = 'platform' | 'airline';

export interface LoyaltyProgram {
  id: string;
  kind: LoyaltyKind;
  /** Marketing carrier code when kind === 'airline', e.g. '6E' */
  airlineCode: string | null;
  airlineName: string;
  programName: string;
  color: string;
  /** How many points equal ₹1 when redeeming */
  pointsPerRupee: number;
  /** Max share of the payable total that points may cover (0–1) */
  maxRedeemShare: number;
  /** Points earned per ₹100 spent on this platform (platform only) */
  earnPerHundred?: number;
  /** Hint shown when linking */
  memberHint: string;
}

/** Catalog of programmes a traveller can link (plus the built-in platform one). */
export const loyaltyPrograms: LoyaltyProgram[] = [
  {
    id: 'altitude',
    kind: 'platform',
    airlineCode: null,
    airlineName: 'Altitude',
    programName: 'Altitude Rewards',
    color: '#7C3AED',
    pointsPerRupee: 10,
    maxRedeemShare: 0.4,
    earnPerHundred: 5,
    memberHint: 'Automatic · every booking on Altitude',
  },
  {
    id: 'indigo',
    kind: 'airline',
    airlineCode: '6E',
    airlineName: 'IndiGo',
    programName: 'BluChip',
    color: '#2B2D6E',
    pointsPerRupee: 5,
    maxRedeemShare: 0.5,
    memberHint: 'e.g. 6E12345678',
  },
  {
    id: 'airindia',
    kind: 'airline',
    airlineCode: 'AI',
    airlineName: 'Air India',
    programName: 'Maharaja Club',
    color: '#CD2C2C',
    pointsPerRupee: 5,
    maxRedeemShare: 0.4,
    memberHint: 'e.g. AI98765432',
  },
  {
    id: 'vistara',
    kind: 'airline',
    airlineCode: 'UK',
    airlineName: 'Vistara',
    programName: 'Club Vistara',
    color: '#6B2C8F',
    pointsPerRupee: 4,
    maxRedeemShare: 0.4,
    memberHint: 'e.g. CV44556677',
  },
  {
    id: 'spicejet',
    kind: 'airline',
    airlineCode: 'SG',
    airlineName: 'SpiceJet',
    programName: 'SpiceClub',
    color: '#CC0000',
    pointsPerRupee: 5,
    maxRedeemShare: 0.35,
    memberHint: 'e.g. SC11223344',
  },
  {
    id: 'akasa',
    kind: 'airline',
    airlineCode: 'QP',
    airlineName: 'Akasa Air',
    programName: 'Akasa Rewards',
    color: '#FF6B00',
    pointsPerRupee: 5,
    maxRedeemShare: 0.35,
    memberHint: 'e.g. QP77889900',
  },
];

export interface LinkedLoyalty {
  programId: string;
  memberNumber: string;
  points: number;
  /** ISO date the membership was linked */
  linkedAt: string;
}

export const initialLinkedLoyalty: LinkedLoyalty[] = [
  {
    programId: 'altitude',
    memberNumber: 'ALT-48291',
    points: 4250,
    linkedAt: '2024-03-12',
  },
  {
    programId: 'indigo',
    memberNumber: '6E20481563',
    points: 8200,
    linkedAt: '2024-06-01',
  },
];

// ─── Shared in-memory store (Account + Booking) ──────────

let linkedStore: LinkedLoyalty[] = initialLinkedLoyalty.map((l) => ({ ...l }));
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getLinkedLoyalty(): LinkedLoyalty[] {
  return linkedStore.map((l) => ({ ...l }));
}

export function setLinkedLoyalty(next: LinkedLoyalty[]) {
  linkedStore = next.map((l) => ({ ...l }));
  notify();
}

export function upsertLinkedLoyalty(link: LinkedLoyalty) {
  const i = linkedStore.findIndex((l) => l.programId === link.programId);
  if (i === -1) linkedStore = [...linkedStore, { ...link }];
  else {
    linkedStore = linkedStore.map((l, idx) => (idx === i ? { ...link } : l));
  }
  notify();
}

export function unlinkLoyalty(programId: string) {
  if (programId === 'altitude') return;
  linkedStore = linkedStore.filter((l) => l.programId !== programId);
  notify();
}

export function updateLoyaltyPoints(programId: string, delta: number) {
  linkedStore = linkedStore.map((l) =>
    l.programId === programId
      ? { ...l, points: Math.max(0, l.points + delta) }
      : l,
  );
  notify();
}

export function subscribeLoyalty(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function programById(id: string): LoyaltyProgram | undefined {
  return loyaltyPrograms.find((p) => p.id === id);
}

export function linkedWithProgram(link: LinkedLoyalty) {
  const program = programById(link.programId);
  return program ? { ...link, program } : null;
}

/** Airline programmes not yet linked (Altitude is always present). */
export function availableAirlinePrograms(linked: LinkedLoyalty[]): LoyaltyProgram[] {
  const have = new Set(linked.map((l) => l.programId));
  return loyaltyPrograms.filter((p) => p.kind === 'airline' && !have.has(p.id));
}

export function validateMemberNumber(
  program: LoyaltyProgram,
  memberNumber: string,
): string | null {
  const v = memberNumber.trim();
  if (v.length < 5) return 'Enter a valid membership number';
  if (v.length > 20) return 'That number looks too long';
  if (!/^[A-Za-z0-9-]+$/.test(v)) return 'Use letters and numbers only';
  if (program.airlineCode && !v.toUpperCase().startsWith(program.airlineCode) && v.length < 8) {
    // Soft hint only — many programmes don't prefix with the IATA code
  }
  return null;
}

export interface RedemptionOption {
  programId: string;
  program: LoyaltyProgram;
  memberNumber: string;
  balance: number;
  /** Max points that can be applied to this fare */
  maxPoints: number;
  /** Rupee value of maxPoints */
  maxValue: number;
}

/**
 * Programmes that can pay down this booking. Airline programmes only when the
 * marketing carrier matches; Altitude Rewards on every platform booking.
 */
export function redeemableForBooking(
  linked: LinkedLoyalty[],
  airlineCode: string,
  payableTotal: number,
): RedemptionOption[] {
  const options: RedemptionOption[] = [];
  for (const link of linked) {
    const program = programById(link.programId);
    if (!program || link.points <= 0) continue;

    if (program.kind === 'airline') {
      if (program.airlineCode !== airlineCode) continue;
    }

    const capValue = Math.floor(payableTotal * program.maxRedeemShare);
    const fromBalance = Math.floor(link.points / program.pointsPerRupee);
    const maxValue = Math.min(capValue, fromBalance, payableTotal);
    const maxPoints = maxValue * program.pointsPerRupee;
    if (maxValue <= 0) continue;

    options.push({
      programId: program.id,
      program,
      memberNumber: link.memberNumber,
      balance: link.points,
      maxPoints,
      maxValue,
    });
  }
  // Platform first, then airline
  return options.sort((a, b) => {
    if (a.program.kind !== b.program.kind) {
      return a.program.kind === 'platform' ? -1 : 1;
    }
    return b.maxValue - a.maxValue;
  });
}

export interface AppliedRedemption {
  programId: string;
  points: number;
  value: number;
}

/** Clamp a slider choice to what the programme and fare allow. */
export function clampRedemption(
  option: RedemptionOption,
  pointsWanted: number,
): AppliedRedemption {
  const stepped = Math.max(0, Math.min(option.maxPoints, pointsWanted));
  // Redeem in whole-rupee chunks
  const value = Math.floor(stepped / option.program.pointsPerRupee);
  const points = value * option.program.pointsPerRupee;
  return { programId: option.programId, points, value };
}

/** Points Altitude Rewards will credit after a paid booking. */
export function altitudeEarnPoints(amountPaid: number): number {
  const program = programById('altitude');
  if (!program?.earnPerHundred) return 0;
  return Math.floor((amountPaid / 100) * program.earnPerHundred);
}

export function emptyAirlineLink(programId: string): LinkedLoyalty {
  return {
    programId,
    memberNumber: '',
    points: 0,
    linkedAt: new Date().toISOString().slice(0, 10),
  };
}

/** Seed balances for newly linked airline programmes (demo). */
export function seedBalanceFor(programId: string): number {
  const seeds: Record<string, number> = {
    indigo: 8200,
    airindia: 3600,
    vistara: 2100,
    spicejet: 1500,
    akasa: 900,
  };
  return seeds[programId] ?? 1000;
}
