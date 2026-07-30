/**
 * Booking domain.
 *
 * Everything the review-and-pay screen needs: passenger shape, add-on
 * catalogues, price maths and — most importantly — validation that can
 * explain precisely what is blocking payment.
 */

// ─── Passengers ──────────────────────────────────────────

export type PassengerType = 'adult' | 'child' | 'infant';
export type Title = 'Mr' | 'Ms' | 'Mrs';
export type Gender = 'male' | 'female' | 'other';

export interface Passenger {
  id: string;
  type: PassengerType;
  title: Title | null;
  firstName: string;
  lastName: string;
  /** ISO date, required for child and infant */
  dob: string | null;
  gender: Gender | null;
  /** Lead traveller — cannot be deleted; ticket contact defaults here */
  primary: boolean;
  seat: string | null;
  mealId: string | null;
  baggageId: string | null;
  assistance: string[];
}

export const PASSENGER_LABEL: Record<PassengerType, string> = {
  adult: 'Adult',
  child: 'Child',
  infant: 'Infant',
};

export const PASSENGER_HINT: Record<PassengerType, string> = {
  adult: '12 years and over',
  child: '2 to 11 years',
  infant: 'Under 2, seated on a lap',
};

export function emptyPassenger(
  type: PassengerType,
  id: string,
  primary = false,
): Passenger {
  return {
    id,
    type,
    title: null,
    firstName: '',
    lastName: '',
    dob: null,
    gender: null,
    primary,
    seat: null,
    mealId: null,
    baggageId: null,
    assistance: [],
  };
}

export function passengerName(p: Passenger): string {
  const full = `${p.firstName} ${p.lastName}`.trim();
  return full || 'Passenger details needed';
}

/** Promote one passenger to primary; clears primary on everyone else. */
export function withPrimary(list: Passenger[], id: string): Passenger[] {
  return list.map((p) => ({ ...p, primary: p.id === id }));
}

// ─── Validation ──────────────────────────────────────────

export interface FieldErrors {
  title?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
}

const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;

export function validatePassenger(p: Passenger): FieldErrors {
  const e: FieldErrors = {};

  if (!p.title) e.title = 'Choose a title';

  if (!p.firstName.trim()) e.firstName = 'First name is required';
  else if (p.firstName.trim().length < 2) e.firstName = 'Use at least 2 letters';
  else if (!NAME_RE.test(p.firstName.trim()))
    e.firstName = 'Letters, spaces and hyphens only';

  if (!p.lastName.trim()) e.lastName = 'Last name is required';
  else if (!NAME_RE.test(p.lastName.trim()))
    e.lastName = 'Letters, spaces and hyphens only';

  if (!p.gender) e.gender = 'Choose one';

  // Airlines need a date of birth to verify child and infant fares
  if (p.type !== 'adult') {
    if (!p.dob) {
      e.dob = 'Date of birth is required for this fare';
    } else {
      const age = ageFrom(p.dob);
      if (age === null) e.dob = 'Use the format DD/MM/YYYY';
      else if (p.type === 'infant' && age >= 2)
        e.dob = 'Infants must be under 2 on the travel date';
      else if (p.type === 'child' && (age < 2 || age > 11))
        e.dob = 'Child fares apply from 2 to 11 years';
    }
  }

  return e;
}

export function isComplete(p: Passenger): boolean {
  return Object.keys(validatePassenger(p)).length === 0;
}

export function ageFrom(dob: string): number | null {
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getDate() !== Number(dd) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getFullYear() !== Number(yyyy)
  ) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const before =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (before) age -= 1;
  return age < 0 ? null : age;
}

// ─── Contact ─────────────────────────────────────────────

export interface Contact {
  email: string;
  phone: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9]{10}$/;

export function validateContact(c: Contact) {
  const e: { email?: string; phone?: string } = {};
  if (!c.email.trim()) e.email = 'Where should we send the ticket?';
  else if (!EMAIL_RE.test(c.email.trim())) e.email = 'Check this email address';

  if (!c.phone.trim()) e.phone = 'Needed for airline updates';
  else if (!PHONE_RE.test(c.phone.replace(/\s/g, '')))
    e.phone = 'Enter a 10-digit mobile number';

  return e;
}

// ─── Add-ons ─────────────────────────────────────────────

export interface MealOption {
  id: string;
  name: string;
  note: string;
  price: number;
}

export const meals: MealOption[] = [
  { id: 'none', name: 'No meal', note: 'Snacks available to buy on board', price: 0 },
  { id: 'veg', name: 'Vegetarian', note: 'Seasonal curry, rice, dessert', price: 450 },
  { id: 'jain', name: 'Jain', note: 'No root vegetables', price: 450 },
  { id: 'nonveg', name: 'Non-vegetarian', note: 'Chicken curry, rice, dessert', price: 550 },
  { id: 'sandwich', name: 'Sandwich combo', note: 'Grilled sandwich and a drink', price: 320 },
  { id: 'child', name: 'Child meal', note: 'Milder flavours, smaller portion', price: 380 },
];

export interface BaggageOption {
  id: string;
  name: string;
  note: string;
  price: number;
}

export const baggage: BaggageOption[] = [
  { id: 'included', name: 'Included allowance', note: '15 kg check-in, 7 kg cabin', price: 0 },
  { id: 'plus5', name: '+5 kg', note: '20 kg total check-in', price: 1200 },
  { id: 'plus10', name: '+10 kg', note: '25 kg total check-in', price: 2100 },
  { id: 'plus20', name: '+20 kg', note: '35 kg total check-in', price: 3800 },
];

export interface AssistOption {
  id: string;
  name: string;
  note: string;
  group: string;
}

export const assistance: AssistOption[] = [
  {
    id: 'wchr',
    name: 'Wheelchair to the aircraft door',
    note: 'You can walk up and down stairs unaided',
    group: 'Mobility',
  },
  {
    id: 'wchs',
    name: 'Wheelchair up the aircraft steps',
    note: 'You can walk short distances but not stairs',
    group: 'Mobility',
  },
  {
    id: 'wchc',
    name: 'Wheelchair to the seat',
    note: 'Assistance needed throughout',
    group: 'Mobility',
  },
  {
    id: 'blnd',
    name: 'Visual assistance',
    note: 'Guidance through the airport and on board',
    group: 'Sensory',
  },
  {
    id: 'deaf',
    name: 'Hearing assistance',
    note: 'Visual announcements and crew briefing',
    group: 'Sensory',
  },
  {
    id: 'medi',
    name: 'Travelling with medical equipment',
    note: 'Oxygen, CPAP or similar — needs airline clearance',
    group: 'Medical',
  },
  {
    id: 'stcr',
    name: 'Travelling with an assistance dog',
    note: 'Documentation required at check-in',
    group: 'Medical',
  },
];

export const ASSIST_NOTICE_HOURS = 48;

// ─── Seats ───────────────────────────────────────────────

export type SeatZone = 'extraLegroom' | 'front' | 'standard';

export interface SeatMeta {
  zone: SeatZone;
  price: number;
  label: string;
}

export const SEAT_ROWS = 30;
export const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function seatZone(row: number): SeatMeta {
  if (row === 1 || row === 12 || row === 13) {
    return { zone: 'extraLegroom', price: 1400, label: 'Extra legroom' };
  }
  if (row <= 5) return { zone: 'front', price: 700, label: 'Front rows' };
  return { zone: 'standard', price: 250, label: 'Standard' };
}

/** Deterministic pseudo-occupancy so the map is stable between renders. */
export function isSeatTaken(row: number, letter: string): boolean {
  const n = row * 31 + letter.charCodeAt(0) * 7;
  return n % 11 < 3;
}

export function seatPrice(seatId: string | null, complimentary = false): number {
  if (!seatId || complimentary) return 0;
  const row = parseInt(seatId, 10);
  return Number.isNaN(row) ? 0 : seatZone(row).price;
}

// ─── Pricing ─────────────────────────────────────────────

export interface PriceLine {
  label: string;
  amount: number;
  note?: string;
}

export interface Quote {
  lines: PriceLine[];
  total: number;
}

export function buildQuote(
  passengers: Passenger[],
  baseFarePerAdult: number,
): Quote {
  const lines: PriceLine[] = [];

  const adults = passengers.filter((p) => p.type === 'adult').length;
  const children = passengers.filter((p) => p.type === 'child').length;
  const infants = passengers.filter((p) => p.type === 'infant').length;

  if (adults > 0) {
    lines.push({
      label: `Base fare · ${adults} adult${adults > 1 ? 's' : ''}`,
      amount: baseFarePerAdult * adults,
    });
  }
  if (children > 0) {
    lines.push({
      label: `Base fare · ${children} child${children > 1 ? 'ren' : ''}`,
      amount: Math.round(baseFarePerAdult * 0.75) * children,
      note: '25% off the adult fare',
    });
  }
  if (infants > 0) {
    lines.push({
      label: `Infant${infants > 1 ? 's' : ''} · ${infants}`,
      amount: 1500 * infants,
      note: 'Seated on a lap',
    });
  }

  const seats = passengers.reduce((sum, p) => sum + seatPrice(p.seat), 0);
  if (seats > 0) lines.push({ label: 'Seat selection', amount: seats });

  const mealTotal = passengers.reduce((sum, p) => {
    const m = meals.find((x) => x.id === p.mealId);
    return sum + (m?.price ?? 0);
  }, 0);
  if (mealTotal > 0) lines.push({ label: 'Meals', amount: mealTotal });

  const bagTotal = passengers.reduce((sum, p) => {
    const b = baggage.find((x) => x.id === p.baggageId);
    return sum + (b?.price ?? 0);
  }, 0);
  if (bagTotal > 0) lines.push({ label: 'Extra baggage', amount: bagTotal });

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxes = Math.round(subtotal * 0.12);
  lines.push({ label: 'Taxes and fees', amount: taxes });

  return { lines, total: subtotal + taxes };
}

/**
 * Quote for an already-priced itinerary: flight total is fixed,
 * then seat / meal / baggage add-ons (with tax on add-ons only).
 */
export function buildTripQuote(
  passengers: Passenger[],
  flightTotal: number,
  flightLabel = 'Flights',
  complimentarySeats = false,
): Quote {
  const lines: PriceLine[] = [];

  if (flightTotal > 0) {
    lines.push({
      label: flightLabel,
      amount: flightTotal,
      note: passengers.length > 0 ? undefined : 'Based on your selected flights',
    });
  }

  const seats = passengers.reduce(
    (sum, p) => sum + seatPrice(p.seat, complimentarySeats),
    0,
  );
  if (seats > 0) lines.push({ label: 'Seat selection', amount: seats });
  else if (complimentarySeats && passengers.some((p) => p.seat)) {
    lines.push({ label: 'Seat selection', amount: 0, note: 'Complimentary with your fare' });
  }

  const mealTotal = passengers.reduce((sum, p) => {
    const m = meals.find((x) => x.id === p.mealId);
    return sum + (m?.price ?? 0);
  }, 0);
  if (mealTotal > 0) lines.push({ label: 'Meals', amount: mealTotal });

  const bagTotal = passengers.reduce((sum, p) => {
    const b = baggage.find((x) => x.id === p.baggageId);
    return sum + (b?.price ?? 0);
  }, 0);
  if (bagTotal > 0) lines.push({ label: 'Extra baggage', amount: bagTotal });

  const addOns = seats + mealTotal + bagTotal;
  if (addOns > 0) {
    const taxes = Math.round(addOns * 0.12);
    lines.push({ label: 'Taxes on add-ons', amount: taxes });
    return { lines, total: flightTotal + addOns + taxes };
  }

  return { lines, total: flightTotal };
}

/** True once every listed passenger has required identity fields. */
export function passengersReady(passengers: Passenger[]): boolean {
  return passengers.length > 0 && passengers.every(isComplete);
}

// ─── Payment ─────────────────────────────────────────────

export type PayMethod = 'card' | 'upi' | 'netbanking';

export const payMethods: Array<{
  id: PayMethod;
  name: string;
  note: string;
  icon: string;
}> = [
  { id: 'upi', name: 'UPI', note: 'Pay with any UPI app', icon: 'smartphone' },
  { id: 'card', name: 'Card', note: 'Credit or debit', icon: 'credit-card' },
  { id: 'netbanking', name: 'Net banking', note: 'All major banks', icon: 'home' },
];

export type PaymentOffer = {
  id: string;
  methods: PayMethod[];
  title: string;
  note: string;
  /** Optional bank / network hint for cards */
  hint?: string;
};

/** @deprecated Prefer data/offers — kept for typed payment selection ids */
export { offersCatalog as paymentOffers, offersForMethod, offerById } from './offers';

export type CardDraft = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

export type UpiDraft = { vpa: string };

export type PaymentSelection = {
  method: PayMethod;
  /** Display detail e.g. ···· 4242 or name@okaxis */
  detail: string;
  offerId: string | null;
};

export function maskCardNumber(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length < 4) return 'Card';
  return `···· ${d.slice(-4)}`;
}

export function formatCardNumber(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(raw: string, previous: string): string {
  const deleting = raw.length < previous.length;
  if (deleting && raw.endsWith('/')) return raw.slice(0, -1);
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function validateCardDraft(c: CardDraft): Partial<Record<keyof CardDraft, string>> {
  const e: Partial<Record<keyof CardDraft, string>> = {};
  if (!c.holder.trim()) e.holder = 'Name on card is required';
  const digits = c.number.replace(/\D/g, '');
  if (digits.length < 15) e.number = 'Enter a valid card number';
  if (!/^\d{2}\/\d{2}$/.test(c.expiry)) e.expiry = 'Use MM/YY';
  else {
    const [mm, yy] = c.expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) e.expiry = 'Invalid month';
    else {
      const now = new Date();
      const exp = new Date(2000 + yy, mm);
      if (exp <= now) e.expiry = 'Card has expired';
    }
  }
  if (!/^\d{3,4}$/.test(c.cvv)) e.cvv = 'Invalid CVV';
  return e;
}

export function validateUpiDraft(u: UpiDraft): { vpa?: string } {
  if (!u.vpa.trim()) return { vpa: 'Enter your UPI ID' };
  if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(u.vpa.trim()))
    return { vpa: 'Use the format name@bank' };
  return {};
}

// ─── Readiness ───────────────────────────────────────────

export interface Blocker {
  kind: 'passengers' | 'passengerDetails' | 'contact' | 'payment';
  message: string;
}

export function firstBlocker(
  passengers: Passenger[],
  contact: Contact,
  method: PayMethod | null,
): Blocker | null {
  if (passengers.length === 0) {
    return { kind: 'passengers', message: 'Add at least one passenger' };
  }

  const incomplete = passengers.filter((p) => !isComplete(p));
  if (incomplete.length > 0) {
    return {
      kind: 'passengerDetails',
      message:
        incomplete.length === 1
          ? 'One passenger still needs details'
          : `${incomplete.length} passengers still need details`,
    };
  }

  const adults = passengers.filter((p) => p.type === 'adult').length;
  const infants = passengers.filter((p) => p.type === 'infant').length;
  if (infants > adults) {
    return {
      kind: 'passengers',
      message: 'Each infant needs an accompanying adult',
    };
  }

  if (Object.keys(validateContact(contact)).length > 0) {
    return { kind: 'contact', message: 'Add contact details for the ticket' };
  }

  if (!method) {
    return { kind: 'payment', message: 'Choose a payment method' };
  }

  return null;
}
