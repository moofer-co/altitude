/**
 * Platform and payment offers — browsable on Offers tab,
 * pickable from the booking payment sheet.
 */

import type { PayMethod } from './booking';

export type OfferCategory =
  | 'payment'
  | 'bank'
  | 'airline'
  | 'platform'
  | 'season';

export type Offer = {
  id: string;
  title: string;
  note: string;
  category: OfferCategory;
  /** Short badge e.g. "₹500 off" */
  badge: string;
  /** Payment methods this offer can apply to (empty = browse-only) */
  methods: PayMethod[];
  hint?: string;
  code?: string;
  expires?: string;
  terms?: string;
};

export const OFFER_CATEGORY_LABEL: Record<OfferCategory, string> = {
  payment: 'Payment',
  bank: 'Bank',
  airline: 'Airline',
  platform: 'Altitude',
  season: 'Seasonal',
};

export const offersCatalog: Offer[] = [
  {
    id: 'upi10',
    title: '10% instant discount with UPI',
    note: 'Up to ₹150 off · applied at pay',
    category: 'payment',
    badge: '10% off',
    methods: ['upi'],
    expires: '31 Aug',
    terms: 'One redemption per booking. Not combinable with bank offers.',
  },
  {
    id: 'upiFlat75',
    title: 'Flat ₹75 off on UPI',
    note: 'On trips above ₹3,000',
    category: 'payment',
    badge: '₹75 off',
    methods: ['upi'],
    expires: '15 Sep',
  },
  {
    id: 'hdfc5',
    title: 'HDFC 5% cashback',
    note: 'Up to ₹500 · credit cards',
    category: 'bank',
    badge: '5% back',
    methods: ['card'],
    hint: 'HDFC',
    expires: '30 Sep',
    terms: 'Credited within 60 days as statement credit.',
  },
  {
    id: 'axis3',
    title: 'Axis Bank 3% off',
    note: 'Up to ₹300 on debit & credit',
    category: 'bank',
    badge: '3% off',
    methods: ['card'],
    hint: 'Axis',
    expires: '31 Aug',
  },
  {
    id: 'icici200',
    title: 'ICICI ₹200 instant off',
    note: 'Min fare ₹6,000 · Visa / Mastercard',
    category: 'bank',
    badge: '₹200 off',
    methods: ['card'],
    hint: 'ICICI',
    code: 'ICICI200',
    expires: '20 Aug',
  },
  {
    id: 'sbi',
    title: 'SBI NetBanking ₹100 off',
    note: 'On bookings above ₹5,000',
    category: 'bank',
    badge: '₹100 off',
    methods: ['netbanking'],
    hint: 'SBI',
    expires: '31 Aug',
  },
  {
    id: 'kotakNb',
    title: 'Kotak NetBanking 2% off',
    note: 'Up to ₹250 · select routes',
    category: 'bank',
    badge: '2% off',
    methods: ['netbanking'],
    hint: 'Kotak',
  },
  {
    id: 'altFirst',
    title: 'Altitude first booking bonus',
    note: '₹250 off your first paid trip',
    category: 'platform',
    badge: '₹250 off',
    methods: ['upi', 'card', 'netbanking'],
    code: 'ALTITUDE250',
    expires: 'Ongoing',
  },
  {
    id: 'altPoints',
    title: '2× Altitude Rewards points',
    note: 'Earn double on cash paid this month',
    category: 'platform',
    badge: '2× points',
    methods: ['upi', 'card', 'netbanking'],
    expires: '31 Aug',
  },
  {
    id: 'indigoBlu',
    title: 'IndiGo BluChip boost',
    note: 'Extra 500 points on IndiGo marketed flights',
    category: 'airline',
    badge: '+500 pts',
    methods: [],
    hint: '6E',
    expires: '15 Sep',
    terms: 'Requires linked BluChip in Account. Applies after travel.',
  },
  {
    id: 'aiClub',
    title: 'Air India Club voucher',
    note: '₹400 off international with Maharaja Club',
    category: 'airline',
    badge: '₹400 off',
    methods: ['card'],
    hint: 'AI',
    code: 'AICLUB400',
  },
  {
    id: 'monsoon',
    title: 'Monsoon getaway',
    note: 'Up to ₹1,200 off weekend domestic trips',
    category: 'season',
    badge: 'Up to ₹1,200',
    methods: ['upi', 'card'],
    code: 'RAIN1200',
    expires: '30 Sep',
  },
  {
    id: 'student',
    title: 'Student fare assist',
    note: 'Extra 5% off with valid student ID at airport',
    category: 'season',
    badge: '5% off',
    methods: ['upi', 'card', 'netbanking'],
    expires: '31 Dec',
    terms: 'Airline may request ID at check-in.',
  },
  {
    id: 'weekend',
    title: 'Friday flyer',
    note: '₹150 off when you depart on a Friday',
    category: 'season',
    badge: '₹150 off',
    methods: ['upi', 'card'],
    code: 'FRIDAY150',
  },
];

export function offersForMethod(method: PayMethod): Offer[] {
  return offersCatalog.filter((o) => o.methods.includes(method));
}

export function offerById(id: string | null | undefined): Offer | undefined {
  if (!id) return undefined;
  return offersCatalog.find((o) => o.id === id);
}

export function offersByCategory(category: OfferCategory | 'all'): Offer[] {
  if (category === 'all') return offersCatalog;
  return offersCatalog.filter((o) => o.category === category);
}
