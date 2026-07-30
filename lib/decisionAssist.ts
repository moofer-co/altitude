import type { MockFlight } from '../data/flights';
import {
  getStats,
  pricePosition,
  durationPosition,
  getBand,
  formatMinutes,
  type Band,
  type Stats,
} from './flightAnalysis';

/**
 * When someone can't decide, the useful question isn't "which flight is best"
 * — it's "best for what?". This module turns a stated priority into a ranking
 * and, just as importantly, into a sentence explaining the choice.
 */

export type Priority = 'price' | 'time' | 'comfort' | 'balanced';

export const PRIORITY_META: Record<
  Priority,
  { label: string; blurb: string; icon: string }
> = {
  price: {
    label: 'Lowest price',
    blurb: 'Cheapest fare, willing to trade time',
    icon: 'tag',
  },
  time: {
    label: 'Shortest journey',
    blurb: 'Get there fast, direct if possible',
    icon: 'trending-up',
  },
  comfort: {
    label: 'Comfort & flexibility',
    blurb: 'Baggage, meals, refundable fares',
    icon: 'shield',
  },
  balanced: {
    label: 'Best balance',
    blurb: 'Reasonable on price, time and comfort',
    icon: 'sliders',
  },
};

export const TIMING_OPTIONS: Array<{ value: Band | 'any'; label: string; hint: string }> = [
  { value: 'any', label: 'No preference', hint: 'Show every departure' },
  { value: 'early', label: 'Before 6am', hint: 'Red-eye departures' },
  { value: 'morning', label: 'Morning', hint: '6am – noon' },
  { value: 'afternoon', label: 'Afternoon', hint: 'Noon – 6pm' },
  { value: 'evening', label: 'Evening', hint: '6pm – 10pm' },
  { value: 'night', label: 'Night', hint: '10pm – midnight' },
];

// ─── Comfort score ───────────────────────────────────────
// 0 = most comfortable, 1 = least.

function comfortPenalty(f: MockFlight): number {
  let penalty = 0;
  if (!f.refundable) penalty += 0.35;
  if (f.stops > 0) penalty += 0.3;
  if (!f.meal.toLowerCase().includes('complimentary')) penalty += 0.2;
  if (parseInt(f.seatPitch, 10) < 31) penalty += 0.15;
  return Math.min(1, penalty);
}

/** Lower is better. */
export function scoreFor(f: MockFlight, stats: Stats, priority: Priority): number {
  const p = pricePosition(f, stats);
  const d = durationPosition(f, stats);
  const c = comfortPenalty(f);

  switch (priority) {
    case 'price':
      return p * 0.78 + d * 0.12 + c * 0.1;
    case 'time':
      return d * 0.68 + (f.stops > 0 ? 0.18 : 0) + p * 0.14;
    case 'comfort':
      return c * 0.68 + p * 0.18 + d * 0.14;
    case 'balanced':
      return p * 0.38 + d * 0.34 + c * 0.28;
  }
}

// ─── Ranking ─────────────────────────────────────────────

export interface AssistResult {
  hero: MockFlight;
  heroReason: string;
  heroHighlights: string[];
  alternatives: Array<{ flight: MockFlight; note: string }>;
  matchedCount: number;
  relaxedTiming: boolean;
}

export function getAssistResult(
  flights: MockFlight[],
  priority: Priority,
  timing: Band | 'any',
): AssistResult | null {
  if (flights.length === 0) return null;

  let pool = flights;
  let relaxedTiming = false;

  if (timing !== 'any') {
    const inBand = flights.filter((f) => getBand(f.departTime) === timing);
    if (inBand.length > 0) {
      pool = inBand;
    } else {
      relaxedTiming = true;
    }
  }

  const stats = getStats(pool);
  const ranked = [...pool].sort(
    (a, b) => scoreFor(a, stats, priority) - scoreFor(b, stats, priority),
  );

  const hero = ranked[0];
  const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a));
  const fastest = pool.reduce((a, b) => (b.durationMin < a.durationMin ? b : a));

  return {
    hero,
    heroReason: explainHero(hero, priority, cheapest, fastest, pool.length),
    heroHighlights: highlightsFor(hero, priority),
    alternatives: ranked.slice(1, 3).map((f) => ({
      flight: f,
      note: compareNote(f, hero),
    })),
    matchedCount: pool.length,
    relaxedTiming,
  };
}

function explainHero(
  hero: MockFlight,
  priority: Priority,
  cheapest: MockFlight,
  fastest: MockFlight,
  poolSize: number,
): string {
  switch (priority) {
    case 'price':
      return hero.id === cheapest.id
        ? `Lowest fare of ${poolSize} flights, and direct.`
        : `₹${(hero.price - cheapest.price).toLocaleString()} above the floor, but avoids a stopover.`;
    case 'time':
      return hero.id === fastest.id
        ? `Shortest journey at ${hero.duration}, non-stop.`
        : `${hero.duration} door to door with no connection risk.`;
    case 'comfort':
      return hero.refundable
        ? `Refundable, ${hero.baggage.split('+')[0].trim()} included, and direct.`
        : `Best baggage and seat pitch among direct flights.`;
    case 'balanced':
      return `Sits close to the front on price, time and flexibility.`;
  }
}

function highlightsFor(f: MockFlight, priority: Priority): string[] {
  const out: string[] = [];

  if (f.stops === 0) out.push('Non-stop');
  else out.push(`1 stop · ${f.stopCity}`);

  out.push(f.duration);

  if (priority === 'comfort' || f.refundable) {
    out.push(f.refundable ? 'Refundable' : 'Non-refundable');
  }
  if (f.meal.toLowerCase().includes('complimentary')) out.push('Meal included');
  if (priority === 'comfort') out.push(`${f.seatPitch} pitch`);

  return out.slice(0, 4);
}

function compareNote(f: MockFlight, hero: MockFlight): string {
  const priceDiff = f.price - hero.price;
  const timeDiff = f.durationMin - hero.durationMin;

  const bits: string[] = [];
  if (priceDiff < 0) bits.push(`₹${Math.abs(priceDiff).toLocaleString()} cheaper`);
  else if (priceDiff > 0) bits.push(`₹${priceDiff.toLocaleString()} more`);

  if (timeDiff < 0) bits.push(`${formatMinutes(timeDiff)} quicker`);
  else if (timeDiff > 0) bits.push(`${formatMinutes(timeDiff)} longer`);

  if (bits.length === 0) bits.push('Similar overall');
  return bits.join(' · ');
}

/** Sort the whole result set once a priority has been chosen. */
export function sortByPriority(
  flights: MockFlight[],
  priority: Priority,
): MockFlight[] {
  const stats = getStats(flights);
  return [...flights].sort(
    (a, b) => scoreFor(a, stats, priority) - scoreFor(b, stats, priority),
  );
}
