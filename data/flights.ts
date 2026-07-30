/**
 * Flight inventory.
 *
 * The shape grew to answer four questions the flat model could not:
 *   · can this party actually be seated?
 *   · who is really operating the aircraft (codeshare)?
 *   · does the itinerary cross a border partway through?
 *   · what does each passenger type actually pay?
 *
 * The original flat fields are kept so existing consumers keep working.
 */

// ─── Segments and layovers ───────────────────────────────

export interface Segment {
  /** Number sold to the passenger */
  marketingFlight: string;
  marketingCarrier: string;
  marketingCode: string;
  /** Carrier actually flying it — differs on codeshares */
  operatingCarrier?: string;
  operatingCode?: string;

  origin: string;
  originTerminal: string;
  destination: string;
  destinationTerminal: string;

  departTime: string;
  arriveTime: string;
  /** 1 when the segment lands the next calendar day */
  dayOffset: number;
  durationMin: number;

  aircraft: string;
  cabin: 'economy' | 'premium' | 'business';
  international: boolean;
}

export interface Layover {
  airport: string;
  city: string;
  durationMin: number;
  /** Arriving and departing terminals differ */
  terminalChange: boolean;
  /** Bags must be collected and checked in again */
  recheckBaggage: boolean;
  /** A transit visa is required to pass through */
  transitVisa: boolean;
  /** Separate tickets — a missed connection is not protected */
  selfTransfer: boolean;
}

// ─── Fare families ───────────────────────────────────────

export interface FareFamily {
  id: string;
  name: string;
  cabin: 'economy' | 'premium' | 'business';
  /** Per-passenger base fare before taxes */
  adultBase: number;
  /** Fraction of the adult base, varies by carrier and route */
  childFactor: number;
  /** Flat on domestic routes */
  infantFlat: number | null;
  /** Fraction of adult base on international routes */
  infantFactor: number | null;
  taxPerSeat: number;
  baggage: string;
  meal: string;
  cancellation: string;
  changeFee: string;
  seatPitch: string;
  refundable: boolean;
  /** Seats remaining in this fare bucket */
  seatsAtFare: number;
}

// ─── Flight ──────────────────────────────────────────────

export interface MockFlight {
  id: string;

  airline: string;
  airlineCode: string;
  airlineColor: string;
  flightNumber: string;

  origin: string;
  originTerminal: string;
  destination: string;
  destinationTerminal: string;
  departTime: string;
  arriveTime: string;
  /** Days between departure and arrival, shown as +1 */
  arrivalDayOffset: number;
  duration: string;
  durationMin: number;
  stops: number;
  stopCity?: string;

  price: number;
  originalPrice?: number;
  refundable: boolean;

  tag?: 'bestValue' | 'cheapest' | 'fastest';
  tagReason?: string;

  baggage: string;
  meal: string;
  cancellation: string;
  seatPitch: string;

  // ── Added for the edge cases ──
  segments: Segment[];
  layovers: Layover[];
  fares: FareFamily[];
  /** Lowest seat count across all segments — the real constraint */
  seatsLeft: number;
  international: boolean;
  /** Domestic and international legs on one itinerary */
  mixedJourney: boolean;
  /** Carriers involved, for the +N avatar */
  carriers: Array<{ code: string; name: string; color: string }>;
}

// ─── Builders ────────────────────────────────────────────

const CARRIERS = {
  AI: { name: 'Air India', color: '#CD2C2C' },
  '6E': { name: 'IndiGo', color: '#2B2D6E' },
  UK: { name: 'Vistara', color: '#6B2C8F' },
  SG: { name: 'SpiceJet', color: '#CC0000' },
  QP: { name: 'Akasa Air', color: '#FF6B00' },
  EK: { name: 'Emirates', color: '#D71921' },
} as const;

type CarrierCode = keyof typeof CARRIERS;

function carrier(code: CarrierCode) {
  return { code, name: CARRIERS[code].name, color: CARRIERS[code].color };
}

function economyFares(base: number, refundable: boolean, seats: number): FareFamily[] {
  return [
    {
      id: 'light',
      name: 'Economy Light',
      cabin: 'economy',
      adultBase: base,
      childFactor: 0.75,
      infantFlat: 1500,
      infantFactor: null,
      taxPerSeat: Math.round(base * 0.14),
      baggage: '7 kg cabin only',
      meal: 'Buy on board',
      cancellation: '₹3,500 cancellation fee',
      changeFee: '₹3,000 per change',
      seatPitch: '29 inches',
      refundable: false,
      seatsAtFare: Math.min(seats, 4),
    },
    {
      id: 'standard',
      name: 'Economy',
      cabin: 'economy',
      adultBase: Math.round(base * 1.18),
      childFactor: 0.75,
      infantFlat: 1500,
      infantFactor: null,
      taxPerSeat: Math.round(base * 0.14),
      baggage: '15 kg check-in + 7 kg cabin',
      meal: 'Buy on board',
      cancellation: '₹2,500 cancellation fee',
      changeFee: '₹2,000 per change',
      seatPitch: '29 inches',
      refundable,
      seatsAtFare: seats,
    },
    {
      id: 'comfort',
      name: 'Economy Comfort',
      cabin: 'economy',
      adultBase: Math.round(base * 1.46),
      childFactor: 0.8,
      infantFlat: 1500,
      infantFactor: null,
      taxPerSeat: Math.round(base * 0.14),
      baggage: '20 kg check-in + 7 kg cabin',
      meal: 'Meal included',
      cancellation: '₹1,000 cancellation fee',
      changeFee: 'Free changes',
      seatPitch: '32 inches',
      refundable: true,
      seatsAtFare: seats,
    },
    {
      id: 'flex',
      name: 'Economy Flex',
      cabin: 'economy',
      adultBase: Math.round(base * 1.9),
      childFactor: 0.85,
      infantFlat: 1500,
      infantFactor: null,
      taxPerSeat: Math.round(base * 0.14),
      baggage: '25 kg check-in + 7 kg cabin',
      meal: 'Meal and beverage included',
      cancellation: 'Free cancellation',
      changeFee: 'Free unlimited changes',
      seatPitch: '32 inches',
      refundable: true,
      seatsAtFare: seats,
    },
  ];
}

function intlFares(base: number, seats: number): FareFamily[] {
  return economyFares(base, true, seats).map((f) => ({
    ...f,
    // Infants pay a percentage of the adult fare on international routes
    infantFlat: null,
    infantFactor: 0.1,
    taxPerSeat: Math.round(f.adultBase * 0.22),
  }));
}

// ─── Inventory ───────────────────────────────────────────

export const mockFlights: MockFlight[] = [
  // 1 · Direct, plenty of seats
  {
    id: 'f1',
    airline: 'Air India',
    airlineCode: 'AI',
    airlineColor: CARRIERS.AI.color,
    flightNumber: 'AI 806',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '06:15',
    arriveTime: '08:50',
    arrivalDayOffset: 0,
    duration: '2h 35m',
    durationMin: 155,
    stops: 0,
    price: 4250,
    originalPrice: 6800,
    refundable: true,
    tag: 'bestValue',
    tagReason: 'Lowest direct fare that is still refundable',
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Complimentary meal',
    cancellation: '₹2,500 cancellation fee',
    seatPitch: '31 inches',
    segments: [
      {
        marketingFlight: 'AI 806',
        marketingCarrier: 'Air India',
        marketingCode: 'AI',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '06:15',
        arriveTime: '08:50',
        dayOffset: 0,
        durationMin: 155,
        aircraft: 'Airbus A320neo',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(4250, true, 9),
    seatsLeft: 9,
    international: false,
    mixedJourney: false,
    carriers: [carrier('AI')],
  },

  // 2 · Cheapest, only two seats left
  {
    id: 'f2',
    airline: 'IndiGo',
    airlineCode: '6E',
    airlineColor: CARRIERS['6E'].color,
    flightNumber: '6E 2154',
    origin: 'DEL',
    originTerminal: 'T1',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '05:40',
    arriveTime: '08:05',
    arrivalDayOffset: 0,
    duration: '2h 25m',
    durationMin: 145,
    stops: 0,
    price: 3890,
    refundable: false,
    tag: 'cheapest',
    tagReason: 'Lowest fare on this route today',
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Buy on board',
    cancellation: '₹3,500 cancellation fee',
    seatPitch: '29 inches',
    segments: [
      {
        marketingFlight: '6E 2154',
        marketingCarrier: 'IndiGo',
        marketingCode: '6E',
        origin: 'DEL',
        originTerminal: 'T1',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '05:40',
        arriveTime: '08:05',
        dayOffset: 0,
        durationMin: 145,
        aircraft: 'Airbus A320',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(3890, false, 2),
    seatsLeft: 2,
    international: false,
    mixedJourney: false,
    carriers: [carrier('6E')],
  },

  // 3 · Fastest
  {
    id: 'f3',
    airline: 'Vistara',
    airlineCode: 'UK',
    airlineColor: CARRIERS.UK.color,
    flightNumber: 'UK 843',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T2',
    departTime: '07:00',
    arriveTime: '09:20',
    arrivalDayOffset: 0,
    duration: '2h 20m',
    durationMin: 140,
    stops: 0,
    price: 5100,
    refundable: true,
    tag: 'fastest',
    tagReason: '15 minutes quicker than the average direct',
    baggage: '20 kg check-in + 7 kg cabin',
    meal: 'Complimentary meal and beverage',
    cancellation: 'Free cancellation until 48h before',
    seatPitch: '32 inches',
    segments: [
      {
        marketingFlight: 'UK 843',
        marketingCarrier: 'Vistara',
        marketingCode: 'UK',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T2',
        departTime: '07:00',
        arriveTime: '09:20',
        dayOffset: 0,
        durationMin: 140,
        aircraft: 'Airbus A320neo',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(5100, true, 12),
    seatsLeft: 12,
    international: false,
    mixedJourney: false,
    carriers: [carrier('UK')],
  },

  // 4 · One stop with a terminal change
  {
    id: 'f4',
    airline: 'IndiGo',
    airlineCode: '6E',
    airlineColor: CARRIERS['6E'].color,
    flightNumber: '6E 6437',
    origin: 'DEL',
    originTerminal: 'T1',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '11:10',
    arriveTime: '15:45',
    arrivalDayOffset: 0,
    duration: '4h 35m',
    durationMin: 275,
    stops: 1,
    stopCity: 'Mumbai',
    price: 3450,
    originalPrice: 5200,
    refundable: false,
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Buy on board',
    cancellation: '₹3,500 cancellation fee',
    seatPitch: '29 inches',
    segments: [
      {
        marketingFlight: '6E 6437',
        marketingCarrier: 'IndiGo',
        marketingCode: '6E',
        origin: 'DEL',
        originTerminal: 'T1',
        destination: 'BOM',
        destinationTerminal: 'T1',
        departTime: '11:10',
        arriveTime: '13:20',
        dayOffset: 0,
        durationMin: 130,
        aircraft: 'Airbus A320',
        cabin: 'economy',
        international: false,
      },
      {
        marketingFlight: '6E 512',
        marketingCarrier: 'IndiGo',
        marketingCode: '6E',
        origin: 'BOM',
        originTerminal: 'T2',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '14:20',
        arriveTime: '15:45',
        dayOffset: 0,
        durationMin: 85,
        aircraft: 'ATR 72',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [
      {
        airport: 'BOM',
        city: 'Mumbai',
        durationMin: 60,
        terminalChange: true,
        recheckBaggage: false,
        transitVisa: false,
        selfTransfer: false,
      },
    ],
    fares: economyFares(3450, false, 6),
    seatsLeft: 6,
    international: false,
    mixedJourney: false,
    carriers: [carrier('6E')],
  },

  // 5 · Codeshare — sold by Air India, flown by Vistara
  {
    id: 'f5',
    airline: 'Air India',
    airlineCode: 'AI',
    airlineColor: CARRIERS.AI.color,
    flightNumber: 'AI 2841',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T2',
    departTime: '14:20',
    arriveTime: '17:00',
    arrivalDayOffset: 0,
    duration: '2h 40m',
    durationMin: 160,
    stops: 0,
    price: 4800,
    refundable: true,
    baggage: '20 kg check-in + 7 kg cabin',
    meal: 'Complimentary meal',
    cancellation: '₹2,000 cancellation fee',
    seatPitch: '32 inches',
    segments: [
      {
        marketingFlight: 'AI 2841',
        marketingCarrier: 'Air India',
        marketingCode: 'AI',
        operatingCarrier: 'Vistara',
        operatingCode: 'UK',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T2',
        departTime: '14:20',
        arriveTime: '17:00',
        dayOffset: 0,
        durationMin: 160,
        aircraft: 'Airbus A320neo',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(4800, true, 7),
    seatsLeft: 7,
    international: false,
    mixedJourney: false,
    carriers: [carrier('AI'), carrier('UK')],
  },

  // 6 · Mixed domestic and international via Dubai, self-transfer
  {
    id: 'f6',
    airline: 'IndiGo',
    airlineCode: '6E',
    airlineColor: CARRIERS['6E'].color,
    flightNumber: '6E 1401',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '21:30',
    arriveTime: '09:15',
    arrivalDayOffset: 1,
    duration: '11h 45m',
    durationMin: 705,
    stops: 1,
    stopCity: 'Dubai',
    price: 3200,
    refundable: false,
    baggage: '20 kg check-in + 7 kg cabin',
    meal: 'Meal included on the international leg',
    cancellation: '₹4,500 cancellation fee',
    seatPitch: '30 inches',
    segments: [
      {
        marketingFlight: '6E 1401',
        marketingCarrier: 'IndiGo',
        marketingCode: '6E',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'DXB',
        destinationTerminal: 'T2',
        departTime: '21:30',
        arriveTime: '23:55',
        dayOffset: 0,
        durationMin: 235,
        aircraft: 'Airbus A321neo',
        cabin: 'economy',
        international: true,
      },
      {
        marketingFlight: 'EK 568',
        marketingCarrier: 'Emirates',
        marketingCode: 'EK',
        origin: 'DXB',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '03:40',
        arriveTime: '09:15',
        dayOffset: 1,
        durationMin: 260,
        aircraft: 'Boeing 777-300ER',
        cabin: 'economy',
        international: true,
      },
    ],
    layovers: [
      {
        airport: 'DXB',
        city: 'Dubai',
        durationMin: 225,
        terminalChange: true,
        recheckBaggage: true,
        transitVisa: false,
        selfTransfer: true,
      },
    ],
    fares: intlFares(3200, 5),
    seatsLeft: 5,
    international: true,
    mixedJourney: true,
    carriers: [carrier('6E'), carrier('EK')],
  },

  // 7 · One seat left — hard block for any group
  {
    id: 'f7',
    airline: 'Akasa Air',
    airlineCode: 'QP',
    airlineColor: CARRIERS.QP.color,
    flightNumber: 'QP 1103',
    origin: 'DEL',
    originTerminal: 'T2',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '16:50',
    arriveTime: '19:25',
    arrivalDayOffset: 0,
    duration: '2h 35m',
    durationMin: 155,
    stops: 0,
    price: 4050,
    refundable: false,
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Buy on board',
    cancellation: '₹2,500 cancellation fee',
    seatPitch: '30 inches',
    segments: [
      {
        marketingFlight: 'QP 1103',
        marketingCarrier: 'Akasa Air',
        marketingCode: 'QP',
        origin: 'DEL',
        originTerminal: 'T2',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '16:50',
        arriveTime: '19:25',
        dayOffset: 0,
        durationMin: 155,
        aircraft: 'Boeing 737 MAX',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(4050, false, 1),
    seatsLeft: 1,
    international: false,
    mixedJourney: false,
    carriers: [carrier('QP')],
  },

  // 8 · Overnight, arrives next day
  {
    id: 'f8',
    airline: 'SpiceJet',
    airlineCode: 'SG',
    airlineColor: CARRIERS.SG.color,
    flightNumber: 'SG 8169',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '22:15',
    arriveTime: '00:45',
    arrivalDayOffset: 1,
    duration: '2h 30m',
    durationMin: 150,
    stops: 0,
    price: 3750,
    refundable: false,
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Buy on board',
    cancellation: '₹3,000 cancellation fee',
    seatPitch: '30 inches',
    segments: [
      {
        marketingFlight: 'SG 8169',
        marketingCarrier: 'SpiceJet',
        marketingCode: 'SG',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '22:15',
        arriveTime: '00:45',
        dayOffset: 1,
        durationMin: 150,
        aircraft: 'Boeing 737-800',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(3750, false, 14),
    seatsLeft: 14,
    international: false,
    mixedJourney: false,
    carriers: [carrier('SG')],
  },

  // 9 · Evening Vistara
  {
    id: 'f9',
    airline: 'Vistara',
    airlineCode: 'UK',
    airlineColor: CARRIERS.UK.color,
    flightNumber: 'UK 821',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T2',
    departTime: '19:00',
    arriveTime: '21:25',
    arrivalDayOffset: 0,
    duration: '2h 25m',
    durationMin: 145,
    stops: 0,
    price: 5500,
    refundable: true,
    baggage: '20 kg check-in + 7 kg cabin',
    meal: 'Complimentary meal and beverage',
    cancellation: 'Free cancellation until 48h before',
    seatPitch: '32 inches',
    segments: [
      {
        marketingFlight: 'UK 821',
        marketingCarrier: 'Vistara',
        marketingCode: 'UK',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'BLR',
        destinationTerminal: 'T2',
        departTime: '19:00',
        arriveTime: '21:25',
        dayOffset: 0,
        durationMin: 145,
        aircraft: 'Boeing 787-9',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [],
    fares: economyFares(5500, true, 20),
    seatsLeft: 20,
    international: false,
    mixedJourney: false,
    carriers: [carrier('UK')],
  },

  // 10 · Two stops, three carriers, self-transfer at both
  {
    id: 'f10',
    airline: 'SpiceJet',
    airlineCode: 'SG',
    airlineColor: CARRIERS.SG.color,
    flightNumber: 'SG 477',
    origin: 'DEL',
    originTerminal: 'T3',
    destination: 'BLR',
    destinationTerminal: 'T1',
    departTime: '09:30',
    arriveTime: '18:40',
    arrivalDayOffset: 0,
    duration: '9h 10m',
    durationMin: 550,
    stops: 2,
    stopCity: 'Hyderabad',
    price: 3100,
    refundable: false,
    baggage: '15 kg check-in + 7 kg cabin',
    meal: 'Buy on board',
    cancellation: '₹3,000 cancellation fee',
    seatPitch: '30 inches',
    segments: [
      {
        marketingFlight: 'SG 477',
        marketingCarrier: 'SpiceJet',
        marketingCode: 'SG',
        origin: 'DEL',
        originTerminal: 'T3',
        destination: 'HYD',
        destinationTerminal: 'T1',
        departTime: '09:30',
        arriveTime: '11:45',
        dayOffset: 0,
        durationMin: 135,
        aircraft: 'Boeing 737-800',
        cabin: 'economy',
        international: false,
      },
      {
        marketingFlight: 'QP 302',
        marketingCarrier: 'Akasa Air',
        marketingCode: 'QP',
        origin: 'HYD',
        originTerminal: 'T1',
        destination: 'BOM',
        destinationTerminal: 'T2',
        departTime: '13:05',
        arriveTime: '14:40',
        dayOffset: 0,
        durationMin: 95,
        aircraft: 'Boeing 737 MAX',
        cabin: 'economy',
        international: false,
      },
      {
        marketingFlight: '6E 774',
        marketingCarrier: 'IndiGo',
        marketingCode: '6E',
        origin: 'BOM',
        originTerminal: 'T1',
        destination: 'BLR',
        destinationTerminal: 'T1',
        departTime: '17:05',
        arriveTime: '18:40',
        dayOffset: 0,
        durationMin: 95,
        aircraft: 'Airbus A320',
        cabin: 'economy',
        international: false,
      },
    ],
    layovers: [
      {
        airport: 'HYD',
        city: 'Hyderabad',
        durationMin: 80,
        terminalChange: false,
        recheckBaggage: true,
        transitVisa: false,
        selfTransfer: true,
      },
      {
        airport: 'BOM',
        city: 'Mumbai',
        durationMin: 145,
        terminalChange: true,
        recheckBaggage: true,
        transitVisa: false,
        selfTransfer: true,
      },
    ],
    fares: economyFares(3100, false, 3),
    seatsLeft: 3,
    international: false,
    mixedJourney: false,
    carriers: [carrier('SG'), carrier('QP'), carrier('6E')],
  },
];

// ─── Date strip ──────────────────────────────────────────
//
// Several weeks so the strip can scroll forward. Prices wobble so the
// cheapest day stays visually obvious.

export interface DateStripDay {
  day: string;
  date: number;
  month: string;
  monthFull: string;
  year: number;
  price: number;
  full: string;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildDateStrip(startISO: string, days: number): DateStripDay[] {
  const start = new Date(`${startISO}T12:00:00`);
  const base = [3100, 4100, 3950, 4250, 4050, 5100, 5500];
  const out: DateStripDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const wobble = ((i * 17) % 9) * 80 - 200;
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 600 : 0;
    const price = Math.max(2800, base[i % base.length] + wobble + weekend);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    out.push({
      day: DAY_LETTERS[d.getDay()],
      date: day,
      month: MONTH_SHORT[m],
      monthFull: MONTH_FULL[m],
      year: y,
      price,
      full: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }
  return out;
}

/** Four weeks from mid-August into September — enough to scroll past a month boundary. */
export const dateStrip: DateStripDay[] = buildDateStrip('2026-08-15', 28);
