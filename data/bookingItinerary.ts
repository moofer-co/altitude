/**
 * Itinerary passed into Review & Pay from one-way, round-trip, or multi-city.
 * Snapshots keep booking independent of mock inventory reshuffles.
 */

import {
  detectTripMode,
  formatLegDate,
  sectorLabel,
  type MultiTripMode,
  type SearchLeg,
} from './multiCity';
import type { FareFamily, MockFlight } from './flights';
import {
  bestFareFor,
  partyTotal,
  type PaxMix,
} from '../lib/flightRules';
import { emptyPassenger, type Passenger } from './booking';
import type { FareClass } from './fares';

export type FarePerks = {
  seatComplimentary: boolean;
  mealComplimentary: boolean;
  checkInKg: number;
  premium: boolean;
};

export type BookingSegment = {
  legId: string;
  label: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  dateISO: string;
  dateLabel: string;
  airline: string;
  airlineCode: string;
  airlineColor: string;
  flightNumber: string;
  depart: string;
  arrive: string;
  arriveOffset: number;
  duration: string;
  stops: number;
  fareName: string;
  price: number;
  refundable: boolean;
  originTerminal: string;
  destTerminal: string;
  international: boolean;
} & FarePerks;

export type BookingTripMode = MultiTripMode | 'oneWay';

export type BookingItinerary = {
  mode: BookingTripMode;
  title: string;
  subtitle: string;
  segments: BookingSegment[];
  flightTotal: number;
  pax: PaxMix;
  /** Marketing carrier for loyalty rules (first segment). */
  marketingCode: string;
  international: boolean;
  departISO: string;
  /** True when any sector includes free seat selection. */
  seatComplimentary: boolean;
  mealComplimentary: boolean;
  premiumFare: boolean;
};

const FIELD_SEP = '|';
const SEG_SEP = ';';

export function parsePaxParams(
  adults?: string | string[],
  children?: string | string[],
  infants?: string | string[],
): PaxMix {
  const n = (v: string | string[] | undefined, fallback: number) => {
    const raw = Array.isArray(v) ? v[0] : v;
    const parsed = parseInt(raw ?? '', 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    adults: Math.max(1, n(adults, 1)),
    children: n(children, 0),
    infants: n(infants, 0),
  };
}

export function seedPassengers(pax: PaxMix, nextId: () => string): Passenger[] {
  const list: Passenger[] = [];
  for (let i = 0; i < pax.adults; i++) {
    list.push(emptyPassenger('adult', nextId(), i === 0));
  }
  for (let i = 0; i < pax.children; i++) list.push(emptyPassenger('child', nextId()));
  for (let i = 0; i < pax.infants; i++) list.push(emptyPassenger('infant', nextId()));
  if (list.length > 0 && !list.some((p) => p.primary)) {
    list[0] = { ...list[0], primary: true };
  }
  return list;
}

export function perksFromFamily(fare: FareFamily | null | undefined): FarePerks {
  if (!fare) {
    return {
      seatComplimentary: false,
      mealComplimentary: false,
      checkInKg: 0,
      premium: false,
    };
  }
  const mealComplimentary = /included|complimentary/i.test(fare.meal);
  const seatComplimentary = fare.id !== 'light';
  const bag = fare.baggage.match(/(\d+)\s*kg\s*check-?in/i);
  const checkInKg = bag ? parseInt(bag[1], 10) : fare.id === 'light' ? 0 : 15;
  const premium = seatComplimentary && (mealComplimentary || fare.id === 'comfort' || fare.id === 'flex');
  return { seatComplimentary, mealComplimentary, checkInKg, premium };
}

export function perksFromFareClass(fare: FareClass): FarePerks {
  return {
    seatComplimentary: fare.seatFree,
    mealComplimentary: fare.mealIncluded,
    checkInKg: fare.checkInKg,
    premium: fare.seatFree && (fare.mealIncluded || fare.tier >= 2),
  };
}

function snapshotFields(
  leg: SearchLeg,
  label: string,
  flight: MockFlight,
  price: number,
  fareName: string,
  perks: FarePerks,
  refundable: boolean,
): string {
  return [
    leg.id,
    label,
    leg.from,
    leg.to,
    leg.fromCity,
    leg.toCity,
    leg.date,
    flight.airline,
    flight.airlineCode,
    flight.airlineColor,
    flight.flightNumber,
    flight.departTime,
    flight.arriveTime,
    String(flight.arrivalDayOffset),
    flight.duration,
    String(flight.stops),
    String(price),
    fareName,
    refundable ? '1' : '0',
    flight.originTerminal,
    flight.destinationTerminal,
    flight.international ? '1' : '0',
    perks.seatComplimentary ? '1' : '0',
    perks.mealComplimentary ? '1' : '0',
    String(perks.checkInKg),
    perks.premium ? '1' : '0',
  ]
    .map((x) => encodeURIComponent(String(x)))
    .join(FIELD_SEP);
}

/** Compact wire format for selected sectors. */
export function serializeBookingSnapshots(
  legs: SearchLeg[],
  selections: Record<string, MockFlight>,
  pax: PaxMix,
  mode: MultiTripMode,
): string {
  return legs
    .map((leg, i) => {
      const flight = selections[leg.id];
      if (!flight) return null;
      const best = bestFareFor(flight, pax);
      const price = best ? best.quote.total : partyTotal(flight, pax);
      const fareName = best?.fare.name ?? 'Economy';
      const perks = perksFromFamily(best?.fare);
      return snapshotFields(
        leg,
        sectorLabel(i, legs.length, mode),
        flight,
        price,
        fareName,
        perks,
        best?.fare.refundable ?? flight.refundable,
      );
    })
    .filter(Boolean)
    .join(SEG_SEP);
}

export function serializeOneWaySnapshot(
  flight: MockFlight,
  fareName: string,
  price: number,
  dateISO: string,
  perks: FarePerks,
  refundable: boolean,
  fromCity = 'Delhi',
  toCity = 'Bengaluru',
): string {
  const leg: SearchLeg = {
    id: 'ow',
    from: flight.origin,
    to: flight.destination,
    fromCity,
    toCity,
    date: dateISO,
  };
  return snapshotFields(leg, 'Flight', flight, price, fareName, perks, refundable);
}

function parseSegment(chunk: string): BookingSegment | null {
  const p = chunk.split(FIELD_SEP).map((x) => decodeURIComponent(x || ''));
  if (p.length < 22) return null;
  const [
    legId,
    label,
    from,
    to,
    fromCity,
    toCity,
    dateISO,
    airline,
    airlineCode,
    airlineColor,
    flightNumber,
    depart,
    arrive,
    arriveOffset,
    duration,
    stops,
    price,
    fareName,
    refundable,
    originTerminal,
    destTerminal,
    international,
    seatComp,
    mealComp,
    checkIn,
    premium,
  ] = p;

  if (!from || !to || !flightNumber) return null;

  const seatComplimentary = seatComp === '1';
  const mealComplimentary = mealComp === '1';
  const checkInKg = parseInt(checkIn ?? '0', 10) || 0;

  return {
    legId: legId || `${from}-${to}`,
    label: label || 'Flight',
    from,
    to,
    fromCity: fromCity || from,
    toCity: toCity || to,
    dateISO,
    dateLabel: formatLegDate(dateISO),
    airline,
    airlineCode,
    airlineColor: airlineColor || '#2B2D6E',
    flightNumber,
    depart,
    arrive,
    arriveOffset: parseInt(arriveOffset, 10) || 0,
    duration,
    stops: parseInt(stops, 10) || 0,
    fareName: fareName || 'Economy',
    price: parseInt(price, 10) || 0,
    refundable: refundable === '1',
    originTerminal: originTerminal || '—',
    destTerminal: destTerminal || '—',
    international: international === '1',
    seatComplimentary,
    mealComplimentary,
    checkInKg,
    premium: premium === '1' || (seatComplimentary && mealComplimentary),
  };
}

export function parseBookingSnapshots(raw?: string | string[]): BookingSegment[] {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return [];
  return s
    .split(SEG_SEP)
    .map(parseSegment)
    .filter(Boolean) as BookingSegment[];
}

function modeSubtitle(mode: BookingTripMode, segments: BookingSegment[]): string {
  if (mode === 'roundTrip') return 'Round trip';
  if (mode === 'multiCity') return `${segments.length} flights · multi-city`;
  return 'One way';
}

function itineraryTitle(mode: BookingTripMode, segments: BookingSegment[]): string {
  if (segments.length === 0) return 'Your trip';
  if (mode === 'roundTrip' && segments.length >= 1) {
    return `${segments[0].fromCity} ⇄ ${segments[0].toCity}`;
  }
  if (mode === 'multiCity') {
    return `${segments[0].from} → ${segments[segments.length - 1].to}`;
  }
  return `${segments[0].from} → ${segments[0].to}`;
}

export function defaultItinerary(): BookingItinerary {
  const dateISO = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  const segment: BookingSegment = {
    legId: 'demo',
    label: 'Flight',
    from: 'DEL',
    to: 'BLR',
    fromCity: 'Delhi',
    toCity: 'Bengaluru',
    dateISO,
    dateLabel: formatLegDate(dateISO),
    airline: 'IndiGo',
    airlineCode: '6E',
    airlineColor: '#2B2D6E',
    flightNumber: '6E 6023',
    depart: '06:15',
    arrive: '08:50',
    arriveOffset: 0,
    duration: '2h 35m',
    stops: 0,
    fareName: 'Economy',
    price: 4250,
    refundable: false,
    originTerminal: 'T3',
    destTerminal: 'T1',
    international: false,
    seatComplimentary: false,
    mealComplimentary: false,
    checkInKg: 15,
    premium: false,
  };
  return {
    mode: 'oneWay',
    title: 'DEL → BLR',
    subtitle: 'One way',
    segments: [segment],
    flightTotal: 4250,
    pax: { adults: 1, children: 0, infants: 0 },
    marketingCode: '6E',
    international: false,
    departISO: new Date(`${dateISO}T06:15:00`).toISOString(),
    seatComplimentary: false,
    mealComplimentary: false,
    premiumFare: false,
  };
}

export function resolveBookingItinerary(params: {
  trip?: string | string[];
  adults?: string | string[];
  children?: string | string[];
  infants?: string | string[];
  total?: string | string[];
}): BookingItinerary {
  const pax = parsePaxParams(params.adults, params.children, params.infants);
  const segments = parseBookingSnapshots(params.trip);

  if (segments.length === 0) {
    const fallback = defaultItinerary();
    return { ...fallback, pax };
  }

  const legsForMode: SearchLeg[] = segments.map((s) => ({
    id: s.legId,
    from: s.from,
    to: s.to,
    fromCity: s.fromCity,
    toCity: s.toCity,
    date: s.dateISO,
  }));

  let mode: BookingTripMode = 'oneWay';
  if (segments.length === 1) mode = 'oneWay';
  else mode = detectTripMode(legsForMode);

  const summed = segments.reduce((n, s) => n + s.price, 0);
  const totalRaw = Array.isArray(params.total) ? params.total[0] : params.total;
  const flightTotal = Math.max(summed, parseInt(totalRaw ?? '', 10) || 0);

  const first = segments[0];
  const seatComplimentary = segments.some((s) => s.seatComplimentary);
  const mealComplimentary = segments.every((s) => s.mealComplimentary);
  const premiumFare = segments.some((s) => s.premium);

  return {
    mode,
    title: itineraryTitle(mode, segments),
    subtitle: modeSubtitle(mode, segments),
    segments,
    flightTotal,
    pax,
    marketingCode: first.airlineCode,
    international: segments.some((s) => s.international),
    departISO: new Date(`${first.dateISO}T${first.depart || '12:00'}:00`).toISOString(),
    seatComplimentary,
    mealComplimentary,
    premiumFare,
  };
}

export function tripModeLabel(mode: BookingTripMode): string {
  if (mode === 'roundTrip') return 'Round trip';
  if (mode === 'multiCity') return 'Multi-city';
  return 'One way';
}
