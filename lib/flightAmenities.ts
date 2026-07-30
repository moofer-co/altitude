/**
 * Flight amenities — shared between filters, cards, and booking summary.
 * Derived from inventory / booking snapshots so every surface tells the same story.
 */

import type { MockFlight } from '../data/flights';
import type { BookingSegment } from '../data/bookingItinerary';

export type AmenityId =
  | 'baggage'
  | 'meal'
  | 'entertainment'
  | 'power'
  | 'wifi'
  | 'refundable'
  | 'reschedule'
  | 'insurance';

export type AmenityIcon =
  | 'shopping-bag'
  | 'briefcase'
  | 'calendar'
  | 'dollar-sign'
  | 'shield'
  | 'coffee'
  | 'monitor'
  | 'wifi'
  | 'battery-charging';

export type AmenityRow = {
  id: AmenityId | 'cabinBag' | 'checkedBag';
  icon: AmenityIcon;
  label: string;
  included: boolean;
};

/** Minimal fields needed to derive amenity rows / filter matches. */
export type AmenitySource = {
  baggage: string;
  meal: string;
  refundable: boolean;
  durationMin: number;
  seatPitch: string;
  international: boolean;
  /** Lead fare change language when available */
  changeFee?: string;
  faresRefundable?: boolean;
};

/** Filter checklist (service amenities travellers search by). */
export const FILTER_AMENITIES: Array<{ id: AmenityId; label: string }> = [
  { id: 'baggage', label: 'Baggage' },
  { id: 'meal', label: 'In-Flight Meal' },
  { id: 'entertainment', label: 'In-Flight Entertainment' },
  { id: 'power', label: 'Power & USB Port' },
  { id: 'wifi', label: 'Wi-Fi' },
];

export function amenitySourceFromFlight(flight: MockFlight): AmenitySource {
  const lead = flight.fares[0];
  return {
    baggage: flight.baggage,
    meal: flight.meal,
    refundable: flight.refundable,
    durationMin: flight.durationMin,
    seatPitch: flight.seatPitch,
    international: flight.international,
    changeFee: lead?.changeFee,
    faresRefundable: flight.fares.some((f) => f.refundable),
  };
}

export function amenitySourceFromSegment(seg: BookingSegment): AmenitySource {
  const cabinKg = 7;
  const baggage =
    seg.checkInKg > 0
      ? `${cabinKg}kg cabin / ${seg.checkInKg}kg check-in`
      : `${cabinKg}kg cabin only`;
  return {
    baggage,
    meal: seg.mealComplimentary ? 'Complimentary meal' : 'Buy on board',
    refundable: seg.refundable,
    durationMin: parseDurationMin(seg.duration),
    seatPitch: seg.premium ? '32"' : '30"',
    international: seg.international,
    changeFee:
      seg.refundable || seg.premium ? 'Free changes' : 'Paid changes',
    faresRefundable: seg.refundable,
  };
}

function parseDurationMin(duration: string): number {
  const h = duration.match(/(\d+)\s*h/i);
  const m = duration.match(/(\d+)\s*m/i);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

function parseCabinKg(baggage: string): number {
  const m = baggage.match(/(\d+)\s*kg\s*cabin/i);
  return m ? Number(m[1]) : 7;
}

function parseCheckInKg(baggage: string): number | null {
  if (/cabin only/i.test(baggage)) return null;
  const m = baggage.match(/(\d+)\s*kg\s*check-?in/i);
  return m ? Number(m[1]) : null;
}

function hasMeal(src: AmenitySource): boolean {
  return /complimentary|included/i.test(src.meal);
}

function hasEntertainment(src: AmenitySource): boolean {
  return src.durationMin >= 150 || src.international;
}

function hasPower(src: AmenitySource): boolean {
  const pitch = parseInt(src.seatPitch, 10);
  return (Number.isFinite(pitch) && pitch >= 31) || src.international;
}

function hasWifi(src: AmenitySource): boolean {
  return src.international || src.durationMin >= 180;
}

function canReschedule(src: AmenitySource): boolean {
  if (src.changeFee && /free/i.test(src.changeFee)) return true;
  return src.refundable || !!src.faresRefundable;
}

function hasInsurance(src: AmenitySource): boolean {
  return src.international || parseInt(src.seatPitch, 10) >= 32;
}

export function sourceHasAmenity(src: AmenitySource, id: AmenityId): boolean {
  switch (id) {
    case 'baggage':
      return parseCheckInKg(src.baggage) !== null;
    case 'meal':
      return hasMeal(src);
    case 'entertainment':
      return hasEntertainment(src);
    case 'power':
      return hasPower(src);
    case 'wifi':
      return hasWifi(src);
    case 'refundable':
      return src.refundable;
    case 'reschedule':
      return canReschedule(src);
    case 'insurance':
      return hasInsurance(src);
    default:
      return false;
  }
}

export function flightHasAmenity(flight: MockFlight, id: AmenityId): boolean {
  return sourceHasAmenity(amenitySourceFromFlight(flight), id);
}

/**
 * Policy + baggage rows for amenity cards (reference-style list).
 */
export function amenityRowsForSource(src: AmenitySource): AmenityRow[] {
  const cabin = parseCabinKg(src.baggage);
  const checked = parseCheckInKg(src.baggage);

  return [
    {
      id: 'cabinBag',
      icon: 'shopping-bag',
      label: `Cabin Baggage 1 × ${cabin} kg`,
      included: true,
    },
    {
      id: 'checkedBag',
      icon: 'briefcase',
      label:
        checked !== null
          ? `Baggage 1 × ${checked} kg`
          : 'No check-in baggage',
      included: checked !== null,
    },
    {
      id: 'reschedule',
      icon: 'calendar',
      label: canReschedule(src) ? 'Reschedule Available' : 'Reschedule fee applies',
      included: canReschedule(src),
    },
    {
      id: 'refundable',
      icon: 'dollar-sign',
      label: src.refundable ? 'Refundable' : 'Non-refundable',
      included: src.refundable,
    },
    {
      id: 'insurance',
      icon: 'shield',
      label: hasInsurance(src)
        ? 'Travel Insurance Included'
        : 'Travel insurance available',
      included: hasInsurance(src),
    },
  ];
}

export function amenityRowsForFlight(flight: MockFlight): AmenityRow[] {
  return amenityRowsForSource(amenitySourceFromFlight(flight));
}

/** Compact service icons (meal, entertainment, wifi, power). */
export function serviceIconsForSource(
  src: AmenitySource,
): Array<{ id: AmenityId; icon: AmenityIcon; label: string; included: boolean }> {
  return [
    {
      id: 'meal',
      icon: 'coffee',
      label: hasMeal(src) ? 'Meal included' : 'Buy on board',
      included: hasMeal(src),
    },
    {
      id: 'entertainment',
      icon: 'monitor',
      label: 'Entertainment',
      included: hasEntertainment(src),
    },
    {
      id: 'wifi',
      icon: 'wifi',
      label: 'Wi-Fi',
      included: hasWifi(src),
    },
    {
      id: 'power',
      icon: 'battery-charging',
      label: 'Power & USB',
      included: hasPower(src),
    },
  ];
}

export function serviceIconsForFlight(
  flight: MockFlight,
): Array<{ id: AmenityId; icon: AmenityIcon; label: string; included: boolean }> {
  return serviceIconsForSource(amenitySourceFromFlight(flight));
}
