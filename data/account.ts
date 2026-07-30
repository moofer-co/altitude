import { allTrips } from './trips';
import {
  tripStatus,
  dateOf,
  type Trip,
  type PaymentRecord,
  type PaymentStatus,
} from './trip';

/**
 * The account is the home for everything that outlives a single booking:
 * who you are, who you travel with, how you like to fly, and what you have
 * spent. Most of it feeds back into booking so nothing is typed twice.
 */

// ─── Profile ─────────────────────────────────────────────

export interface Profile {
  name: string;
  email: string;
  phone: string;
  /** Passport, so international bookings prefill */
  passportNumber: string | null;
  nationality: string;
  passportExpiry: string | null;
  memberSince: string;
}

export const initialProfile: Profile = {
  name: 'Ramesh Mandal',
  email: 'ramesh@example.com',
  phone: '+91 98100 12345',
  passportNumber: 'M4521786',
  nationality: 'Indian',
  passportExpiry: '14/08/2031',
  memberSince: '2024',
};

/** @deprecated Use initialProfile + local state. Kept for import compatibility. */
export const profile = initialProfile;

export interface ProfileErrors {
  name?: string;
  email?: string;
  phone?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{8,16}$/;
const PASSPORT_RE = /^[A-Z0-9]{6,12}$/i;
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function validateProfile(p: Profile): ProfileErrors {
  const e: ProfileErrors = {};
  if (!p.name.trim() || p.name.trim().split(/\s+/).length < 2) {
    e.name = 'Enter your full name as on ID';
  }
  if (!p.email.trim() || !EMAIL_RE.test(p.email.trim())) {
    e.email = 'Enter a valid email';
  }
  if (!p.phone.trim() || !PHONE_RE.test(p.phone.trim())) {
    e.phone = 'Enter a valid phone number';
  }
  if (p.passportNumber) {
    if (!PASSPORT_RE.test(p.passportNumber.trim())) {
      e.passportNumber = 'Use 6 to 12 letters and numbers';
    }
  }
  if (p.passportExpiry) {
    const m = p.passportExpiry.match(DATE_RE);
    if (!m) {
      e.passportExpiry = 'Use the format DD/MM/YYYY';
    } else {
      const expiry = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      if (Number.isNaN(expiry.getTime())) e.passportExpiry = 'Enter a real date';
      else if (expiry.getTime() < Date.now()) e.passportExpiry = 'Passport has already expired';
    }
  } else if (p.passportNumber) {
    e.passportExpiry = 'Expiry is required when a passport is saved';
  }
  return e;
}

// ─── Saved travellers ────────────────────────────────────
//
// The people you book for. Storing them here is the difference between
// re-typing a passport every trip and picking a name.

export interface SavedTraveller {
  id: string;
  name: string;
  relationship: string;
  type: 'adult' | 'child' | 'infant';
  passportNumber: string | null;
  nationality: string;
  passportExpiry: string | null;
  /** Seat and meal defaults carried into booking */
  seatPreference: string | null;
  mealPreference: string | null;
}

export const initialTravellers: SavedTraveller[] = [
  {
    id: 'self',
    name: 'Ramesh Mandal',
    relationship: 'You',
    type: 'adult',
    passportNumber: 'M4521786',
    nationality: 'Indian',
    passportExpiry: '14/08/2031',
    seatPreference: 'Window',
    mealPreference: 'Vegetarian',
  },
  {
    id: 't2',
    name: 'Anita Mandal',
    relationship: 'Spouse',
    type: 'adult',
    passportNumber: 'M4521902',
    nationality: 'Indian',
    passportExpiry: '22/03/2030',
    seatPreference: 'Window',
    mealPreference: 'Vegetarian',
  },
  {
    id: 't3',
    name: 'Aarav Mandal',
    relationship: 'Son',
    type: 'child',
    passportNumber: null,
    nationality: 'Indian',
    passportExpiry: null,
    seatPreference: null,
    mealPreference: null,
  },
];

/** @deprecated Use initialTravellers + local state. */
export const savedTravellers = initialTravellers;

export const RELATIONSHIPS = [
  'Spouse',
  'Partner',
  'Son',
  'Daughter',
  'Parent',
  'Sibling',
  'Friend',
  'Colleague',
  'Other',
] as const;

export const SEAT_OPTIONS = ['Window', 'Aisle', 'No preference'] as const;
export const MEAL_OPTIONS = [
  'Vegetarian',
  'Non-vegetarian',
  'Vegan',
  'No preference',
] as const;

export function emptyTraveller(): SavedTraveller {
  return {
    id: `t${Date.now()}`,
    name: '',
    relationship: 'Other',
    type: 'adult',
    passportNumber: null,
    nationality: 'Indian',
    passportExpiry: null,
    seatPreference: null,
    mealPreference: null,
  };
}

export interface TravellerErrors {
  name?: string;
  relationship?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

export function validateTraveller(t: SavedTraveller): TravellerErrors {
  const e: TravellerErrors = {};
  if (!t.name.trim() || t.name.trim().split(/\s+/).length < 2) {
    e.name = 'Enter the full name as on ID';
  }
  if (!t.relationship.trim()) e.relationship = 'Pick a relationship';

  if (t.type !== 'infant') {
    if (t.passportNumber) {
      if (!PASSPORT_RE.test(t.passportNumber.trim())) {
        e.passportNumber = 'Use 6 to 12 letters and numbers';
      }
    }
    if (t.passportExpiry) {
      const m = t.passportExpiry.match(DATE_RE);
      if (!m) e.passportExpiry = 'Use the format DD/MM/YYYY';
      else {
        const expiry = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        if (Number.isNaN(expiry.getTime())) e.passportExpiry = 'Enter a real date';
        else if (expiry.getTime() < Date.now()) e.passportExpiry = 'Passport has already expired';
      }
    } else if (t.passportNumber) {
      e.passportExpiry = 'Expiry is required when a passport is saved';
    }
  }
  return e;
}

/** True when a passport is missing or expires within six months of today. */
export function documentNeedsAttention(t: SavedTraveller): boolean {
  if (t.type === 'infant') return false;
  if (!t.passportNumber || !t.passportExpiry) return true;
  const [d, m, y] = t.passportExpiry.split('/').map(Number);
  const expiry = new Date(y, m - 1, d).getTime();
  const sixMonths = Date.now() + 182 * 24 * 3600_000;
  return expiry < sixMonths;
}

/** Keep the "You" traveller aligned when the profile is edited. */
export function syncSelfFromProfile(
  travellers: SavedTraveller[],
  p: Profile,
): SavedTraveller[] {
  return travellers.map((t) =>
    t.id === 'self'
      ? {
          ...t,
          name: p.name,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          passportExpiry: p.passportExpiry,
        }
      : t,
  );
}

// ─── Preferences ─────────────────────────────────────────

export interface Preferences {
  seat: 'Window' | 'Aisle' | 'No preference';
  meal: 'Vegetarian' | 'Non-vegetarian' | 'Vegan' | 'No preference';
  homeAirport: string;
  currency: string;
}

export const initialPreferences: Preferences = {
  seat: 'Window',
  meal: 'Vegetarian',
  homeAirport: 'DEL',
  currency: '₹ INR',
};

// ─── Saved address ───────────────────────────────────────

export interface SavedAddress {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export const initialSavedAddress: SavedAddress = {
  label: 'Home',
  line1: '42 Defence Colony',
  line2: '',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110024',
  country: 'India',
};

export interface AddressErrors {
  label?: string;
  line1?: string;
  city?: string;
  pincode?: string;
}

export function validateAddress(a: SavedAddress): AddressErrors {
  const e: AddressErrors = {};
  if (!a.label.trim()) e.label = 'Give this address a name';
  if (!a.line1.trim()) e.line1 = 'Enter street or building';
  if (!a.city.trim()) e.city = 'Enter city';
  if (!a.pincode.trim() || !/^\d{4,10}$/.test(a.pincode.trim())) {
    e.pincode = 'Enter a valid PIN / ZIP';
  }
  return e;
}

export function formatAddressLine(a: SavedAddress): string {
  const parts = [a.line1, a.city, a.pincode].filter((p) => p.trim());
  return parts.join(', ') || 'Add a billing or delivery address';
}

/** @deprecated Use getPreferences() — kept for import compatibility. */
export const preferences = initialPreferences;

// Shared preferences store so Account and Airport Search share home airport.
let prefsStore: Preferences = { ...initialPreferences };
const prefsListeners = new Set<() => void>();

function notifyPrefs() {
  prefsListeners.forEach((l) => l());
}

export function getPreferences(): Preferences {
  return { ...prefsStore };
}

export function updatePreferences(partial: Partial<Preferences>): Preferences {
  prefsStore = { ...prefsStore, ...partial };
  notifyPrefs();
  return getPreferences();
}

export function subscribePreferences(listener: () => void): () => void {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

export const CURRENCIES = ['₹ INR', '$ USD', '€ EUR', '£ GBP', 'AED'] as const;

export type PrefKey = keyof Preferences;

export const PREF_META: Record<
  PrefKey,
  { label: string; icon: string; options: readonly string[] }
> = {
  seat: { label: 'Seat', icon: 'grid', options: SEAT_OPTIONS },
  meal: { label: 'Meal', icon: 'coffee', options: MEAL_OPTIONS },
  homeAirport: { label: 'Home airport', icon: 'map-pin', options: [] }, // filled from airports
  currency: { label: 'Currency', icon: 'dollar-sign', options: CURRENCIES },
};

// ─── Notifications ───────────────────────────────────────
//
// The assistance layer needs a settings home. Each of these maps to a real
// prompt the product already produces.

export interface NotificationSetting {
  id: string;
  title: string;
  detail: string;
  channel: 'push' | 'email';
  enabled: boolean;
}

export const initialNotifications: NotificationSetting[] = [
  {
    id: 'checkin',
    title: 'Check-in reminders',
    detail: 'When online check-in opens for your flight',
    channel: 'push',
    enabled: true,
  },
  {
    id: 'gate',
    title: 'Gate and time changes',
    detail: 'Delays, gate moves, boarding calls',
    channel: 'push',
    enabled: true,
  },
  {
    id: 'docs',
    title: 'Passport expiry warnings',
    detail: 'Before a document is too close to expiry to fly',
    channel: 'push',
    enabled: true,
  },
  {
    id: 'fare',
    title: 'Fare drops on saved routes',
    detail: 'When a route you watch gets cheaper',
    channel: 'push',
    enabled: false,
  },
  {
    id: 'receipt',
    title: 'Booking receipts',
    detail: 'Itemised receipt after each payment',
    channel: 'email',
    enabled: true,
  },
];

/** @deprecated Use initialNotifications + local state. */
export const notificationSettings = initialNotifications;

// ─── Payment methods ─────────────────────────────────────

export interface PaymentMethod {
  id: string;
  kind: 'upi' | 'card';
  label: string;
  detail: string;
  primary: boolean;
  /** Card-only fields stored for editing */
  last4?: string;
  expiry?: string;
  /** UPI VPA */
  vpa?: string;
}

export const initialPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm1',
    kind: 'upi',
    label: 'UPI',
    detail: 'ramesh@okhdfcbank',
    primary: true,
    vpa: 'ramesh@okhdfcbank',
  },
  {
    id: 'pm2',
    kind: 'card',
    label: 'HDFC Credit Card',
    detail: 'Ending 4821 · expires 09/28',
    primary: false,
    last4: '4821',
    expiry: '09/28',
  },
];

/** @deprecated Use initialPaymentMethods + local state. */
export const paymentMethods = initialPaymentMethods;

export function emptyPaymentMethod(kind: 'upi' | 'card'): PaymentMethod {
  return {
    id: `pm${Date.now()}`,
    kind,
    label: kind === 'upi' ? 'UPI' : 'Card',
    detail: '',
    primary: false,
    vpa: kind === 'upi' ? '' : undefined,
    last4: kind === 'card' ? '' : undefined,
    expiry: kind === 'card' ? '' : undefined,
  };
}

export interface PaymentMethodErrors {
  vpa?: string;
  label?: string;
  last4?: string;
  expiry?: string;
}

const VPA_RE = /^[\w.-]{2,}@[a-z]{2,}$/i;

export function validatePaymentMethod(pm: PaymentMethod): PaymentMethodErrors {
  const e: PaymentMethodErrors = {};
  if (pm.kind === 'upi') {
    if (!pm.vpa?.trim() || !VPA_RE.test(pm.vpa.trim())) {
      e.vpa = 'Enter a valid UPI ID, e.g. name@bank';
    }
  } else {
    if (!pm.label.trim()) e.label = 'Give the card a name';
    if (!pm.last4 || !/^\d{4}$/.test(pm.last4)) e.last4 = 'Enter the last 4 digits';
    if (!pm.expiry || !/^\d{2}\/\d{2}$/.test(pm.expiry)) {
      e.expiry = 'Use MM/YY';
    } else {
      const [mm, yy] = pm.expiry.split('/').map(Number);
      if (mm < 1 || mm > 12) e.expiry = 'Month must be 01–12';
      else {
        const exp = new Date(2000 + yy, mm); // first day of next month
        if (exp.getTime() < Date.now()) e.expiry = 'Card has expired';
      }
    }
  }
  return e;
}

export function paymentMethodDetail(pm: PaymentMethod): string {
  if (pm.kind === 'upi') return pm.vpa?.trim() || pm.detail;
  return `Ending ${pm.last4} · expires ${pm.expiry}`;
}

export function withPrimary(
  methods: PaymentMethod[],
  id: string,
): PaymentMethod[] {
  return methods.map((m) => ({ ...m, primary: m.id === id }));
}

// ─── Derived spend and history ───────────────────────────
//
// Nothing new is stored here — it reads the same trip records the itinerary
// and payment history already use, so the numbers can never drift.

export interface SpendSummary {
  totalPaid: number;
  tripCount: number;
  flightsFlown: number;
  upcomingCount: number;
  /** Rolling by calendar year */
  thisYear: number;
  currency: string;
}

export function spendSummary(now: number): SpendSummary {
  const year = new Date(now).getFullYear();
  let total = 0;
  let thisYear = 0;
  let flown = 0;
  let upcoming = 0;

  for (const t of allTrips) {
    const net = netPaid(t);
    total += net;
    if (new Date(t.bookedOn).getFullYear() === year) thisYear += net;
    const status = tripStatus(t, now);
    if (status === 'arrived') flown += 1;
    else if (status !== 'cancelled') upcoming += 1;
  }

  return {
    totalPaid: total,
    tripCount: allTrips.length,
    flightsFlown: flown,
    upcomingCount: upcoming,
    thisYear,
    currency: '₹',
  };
}

/** Net of any refund already recorded on the trip. */
function netPaid(t: Trip): number {
  const refunded = t.refund ? t.refund.amount : 0;
  return t.totalPaid - refunded;
}

export interface RouteFrequency {
  route: string;
  count: number;
}

/** The routes flown most, for a light "your travel" readout. */
export function topRoutes(): RouteFrequency[] {
  const counts = new Map<string, number>();
  for (const t of allTrips) {
    const key = `${t.segments[0].originCity} → ${t.segments[t.segments.length - 1].destinationCity}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export interface SpendEntry {
  id: string;
  pnr: string;
  route: string;
  label: string;
  amount: number;
  method: string;
  at: string;
  status: PaymentStatus;
  lines: PaymentRecord['lines'];
  dateLabel: string;
  year: number;
}

/** Flatten every payment across every trip, newest first. */
export function spendHistory(): SpendEntry[] {
  const entries: SpendEntry[] = [];
  for (const t of allTrips) {
    const route = `${t.segments[0].origin} → ${t.segments[t.segments.length - 1].destination}`;
    for (const pay of t.payments) {
      entries.push({
        id: `${t.pnr}-${pay.id}`,
        pnr: t.pnr,
        route,
        label: pay.label,
        amount: pay.amount,
        method: pay.method,
        at: pay.at,
        status: pay.status,
        lines: pay.lines,
        dateLabel: dateOf(pay.at),
        year: new Date(pay.at).getFullYear(),
      });
    }
  }
  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function spendByYear(entries: SpendEntry[]): Array<{ year: number; total: number }> {
  const map = new Map<number, number>();
  for (const e of entries) {
    // Refunds are negative amounts — they reduce the year total
    map.set(e.year, (map.get(e.year) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => b.year - a.year);
}

// ─── Support content ─────────────────────────────────────

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  body: string;
}

export const helpArticles: HelpArticle[] = [
  {
    id: 'h1',
    category: 'Booking',
    title: 'How do I change a passenger name?',
    body: 'Open the trip, choose Manage booking, then Correct a name. Only spelling fixes are allowed — the corrected name must still match the photo ID you carry. Checked-in travellers cannot be renamed online.',
  },
  {
    id: 'h2',
    category: 'Booking',
    title: 'Can I change my travel date?',
    body: 'Yes, from Manage booking → Change travel date. You will see the fare difference and any change fee before confirming. Changing date cancels check-in if it was already done.',
  },
  {
    id: 'h3',
    category: 'Check-in',
    title: 'When does online check-in open?',
    body: 'Usually 48 hours before departure for domestic flights, and 24 hours for international. The Trips tab and check-in reminder will tell you the exact window for your booking.',
  },
  {
    id: 'h4',
    category: 'Check-in',
    title: 'What documents do I need for international travel?',
    body: 'A passport valid for at least six months beyond your return date, plus any visa required by the destination. Save passport details on your travellers so check-in can prefill them.',
  },
  {
    id: 'h5',
    category: 'Payments',
    title: 'Where can I find my receipt?',
    body: 'Every charge appears under Payments on the itinerary, with a line-by-line breakdown. The same records feed Spend history on your account. Email receipts are sent when Booking receipts is enabled in Notifications.',
  },
  {
    id: 'h6',
    category: 'Payments',
    title: 'How long do refunds take?',
    body: 'After a cancellation we initiate the refund immediately. Banks typically take 5 to 7 working days to credit the original payment method. The itinerary shows each stage of the refund timeline.',
  },
  {
    id: 'h7',
    category: 'Account',
    title: 'Why save travellers?',
    body: 'Saved travellers carry passport details and seat or meal defaults into every booking, so you type them once. Passport expiry warnings also use this list.',
  },
  {
    id: 'h8',
    category: 'Account',
    title: 'How do I contact support?',
    body: 'For a live booking, open the trip and use Help from Manage booking. For account questions, email support@altitude.travel or call +91 1800 123 4567 (9am–9pm IST).',
  },
];

export const helpCategories = ['All', 'Booking', 'Check-in', 'Payments', 'Account'] as const;

export const SUPPORT_CONTACT = {
  email: 'support@altitude.travel',
  phone: '+91 1800 123 4567',
  hours: '9am–9pm IST, every day',
};

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

export const termsSections: TermsSection[] = [
  {
    title: 'Using Altitude',
    paragraphs: [
      'Altitude helps you find and book flights. By using the app you agree to these terms and our privacy practices.',
      'You must be at least 18 to make a booking, or have a parent or guardian book on your behalf.',
    ],
  },
  {
    title: 'Bookings and fares',
    paragraphs: [
      'Fares shown include taxes and fees known at the time of search. The price locked at payment is the price you pay.',
      'Airline rules govern changes, cancellations and refunds. We surface those rules before you confirm, but the carrier’s conditions of carriage remain binding.',
    ],
  },
  {
    title: 'Your data',
    paragraphs: [
      'We store the profile, travellers, preferences and payment methods you save so booking stays quick. Passport details are shared with carriers and border authorities only when needed for travel.',
      'Payment credentials are collected by the payment provider on their secure page — we store a label and last digits, never the full card number.',
    ],
  },
  {
    title: 'Notifications',
    paragraphs: [
      'You control reminders from Account → Notifications. Operational alerts about your live trips (delays, gate changes) stay on by default because missing them can mean missing a flight.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      `Questions about these terms: ${SUPPORT_CONTACT.email}. We reply within one working day.`,
    ],
  },
];

export function maskDate(raw: string, previous: string): string {
  const deleting = raw.length < previous.length;
  if (deleting && raw.endsWith('/')) return raw.slice(0, -1);
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join('/');
}

export function maskCardExpiry(raw: string, previous: string): string {
  const deleting = raw.length < previous.length;
  if (deleting && raw.endsWith('/')) return raw.slice(0, -1);
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean).join('/');
}
