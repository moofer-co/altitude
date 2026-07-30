/**
 * Multi-city / round-trip search legs and per-sector mock options.
 * Kept separate from one-way `/flights` inventory consumers.
 */

import { mockFlights, type MockFlight, type Segment } from './flights';
import type { Airport } from '../types';

export type SearchLeg = {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  date: string; // YYYY-MM-DD
};

export type MultiTripMode = 'multiCity' | 'roundTrip';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatLegDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatLegDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function detectTripMode(legs: SearchLeg[]): MultiTripMode {
  if (
    legs.length === 2 &&
    legs[0].from === legs[1].to &&
    legs[0].to === legs[1].from
  ) {
    return 'roundTrip';
  }
  return 'multiCity';
}

export function tripTitle(mode: MultiTripMode, legs: SearchLeg[]): string {
  if (mode === 'roundTrip') {
    return `${legs[0].fromCity} ⇄ ${legs[0].toCity}`;
  }
  return `${legs.length} flights · ${legs[0].from} → ${legs[legs.length - 1].to}`;
}

/** Compact wire format: FROM|TO|FROMCITY|TOCITY|DATE;... */
export function serializeSearchLegs(legs: SearchLeg[]): string {
  return legs
    .map((l) =>
      [l.from, l.to, l.fromCity, l.toCity, l.date, l.id]
        .map(encodeURIComponent)
        .join('|'),
    )
    .join(';');
}

export function parseSearchLegs(raw?: string | string[]): SearchLeg[] {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return [];
  return s
    .split(';')
    .map((chunk) => {
      const [from, to, fromCity, toCity, date, id] = chunk
        .split('|')
        .map((p) => decodeURIComponent(p || ''));
      if (!from || !to || !date) return null;
      return {
        id: id || `${from}-${to}-${date}`,
        from,
        to,
        fromCity: fromCity || from,
        toCity: toCity || to,
        date,
      } satisfies SearchLeg;
    })
    .filter(Boolean) as SearchLeg[];
}

export function legsFromComposer(
  legs: Array<{
    id: string;
    from: Airport | null;
    to: Airport | null;
    date: string | null;
  }>,
): SearchLeg[] {
  return legs
    .filter((l): l is typeof l & { from: Airport; to: Airport; date: string } =>
      Boolean(l.from && l.to && l.date),
    )
    .map((l) => ({
      id: l.id,
      from: l.from.iata,
      to: l.to.iata,
      fromCity: l.from.city,
      toCity: l.to.city,
      date: l.date,
    }));
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function remapSegment(seg: Segment, from: string, to: string, only: boolean): Segment {
  if (only) {
    return { ...seg, origin: from, destination: to };
  }
  // Keep via points; pin first origin / last destination later at flight level
  return { ...seg };
}

/** Build plausible options for one search sector from the shared mock pool. */
export function optionsForLeg(leg: SearchLeg, legIndex: number): MockFlight[] {
  const seed = hashSeed(`${leg.from}${leg.to}${leg.date}${legIndex}`);
  const pool = [...mockFlights].sort(
    (a, b) => (hashSeed(a.id + seed) % 97) - (hashSeed(b.id + seed) % 97),
  );

  return pool.slice(0, 7).map((f, i) => {
    const priceJitter = 1 + ((seed + i * 17) % 21) / 100;
    const price = Math.round((f.price * priceJitter) / 50) * 50;
    const directish = f.stops === 0 || i % 3 === 0;
    const segments =
      directish && f.segments.length > 0
        ? [
            {
              ...f.segments[0],
              origin: leg.from,
              destination: leg.to,
              marketingFlight: `${f.airlineCode}${100 + ((seed + i) % 800)}`,
            },
          ]
        : f.segments.map((seg, si, arr) => {
            if (si === 0) return { ...seg, origin: leg.from };
            if (si === arr.length - 1) return { ...seg, destination: leg.to };
            return remapSegment(seg, leg.from, leg.to, false);
          });

    const stops = Math.max(0, segments.length - 1);
    return {
      ...f,
      id: `${leg.id}-${f.id}`,
      origin: leg.from,
      destination: leg.to,
      price,
      originalPrice: f.originalPrice
        ? Math.round(f.originalPrice * priceJitter)
        : undefined,
      stops,
      stopCity: stops > 0 ? f.stopCity : undefined,
      segments,
      layovers: stops > 0 ? f.layovers.slice(0, stops) : [],
      fares: f.fares.map((fare) => ({
        ...fare,
        adultBase: Math.round(fare.adultBase * priceJitter),
        taxPerSeat: Math.round(fare.taxPerSeat * priceJitter),
      })),
      tag: undefined,
      tagReason: undefined,
    } satisfies MockFlight;
  });
}

export function sectorLabel(index: number, total: number, mode: MultiTripMode): string {
  if (mode === 'roundTrip') {
    return index === 0 ? 'Outbound' : 'Return';
  }
  return `Flight ${index + 1} of ${total}`;
}
