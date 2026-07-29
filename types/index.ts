/**
 * Altitude – Shared Types
 *
 * These types define the data contracts for the MVP.
 * They're intentionally kept in one file until complexity demands splitting.
 *
 * Phase 2/3 note: the UserPreferences type is the integration point
 * for the browser extension. The extension will push signals (searched
 * destinations, date ranges, airline preferences) into the same shape.
 * Keep this type source-agnostic — it describes *what* the user wants,
 * not *where* the signal came from.
 */

// ─── Airports ────────────────────────────────────────────

export interface Airport {
  iata: string;        // "DEL"
  name: string;        // "Indira Gandhi International Airport"
  city: string;        // "New Delhi"
  country: string;     // "India"
  countryCode: string; // "IN"
}

// ─── Passengers ──────────────────────────────────────────

export interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

// ─── Search ──────────────────────────────────────────────

export type TripType = 'oneWay' | 'roundTrip' | 'multiCity';
export type CabinClass = 'economy' | 'premiumEconomy' | 'business' | 'first';

export interface FlightSearch {
  origin: Airport | null;
  destination: Airport | null;
  departDate: string | null;   // ISO date string
  returnDate: string | null;   // null for one-way
  passengers: Passengers;
  tripType: TripType;
  cabinClass: CabinClass;
}

// ─── Flights / Recommendations ───────────────────────────

export type RecommendationTag = 'bestValue' | 'cheapest' | 'fastest';

export interface FlightSegment {
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  origin: string;         // IATA
  destination: string;    // IATA
  departTime: string;     // "14:30"
  arriveTime: string;     // "18:45"
  duration: number;       // minutes
}

export interface FlightOption {
  id: string;
  segments: FlightSegment[];
  totalDuration: number;       // minutes
  stops: number;
  price: number;
  currency: string;
  tag?: RecommendationTag;
  tagReason?: string;          // "2h faster than average"
}

// ─── User Preferences (future extension integration) ─────
//
// Source-agnostic. The app populates this from in-app behavior.
// The browser extension will populate it from external search activity.
// Both write to the same shape — the recommendation engine consumes it
// without caring where the signal originated.

export type SignalSource = 'app' | 'extension' | 'manual';

export interface UserSignal {
  source: SignalSource;
  timestamp: string;       // ISO
}

export interface UserPreferences {
  recentSearches: Array<{
    origin?: string;         // IATA or city
    destination?: string;
    dateRange?: { from: string; to: string };
    signal: UserSignal;
  }>;
  preferredAirlines: string[];
  preferredCabin: CabinClass;
  priceSensitivity: 'low' | 'medium' | 'high';
  // Extension-contributed — destinations the user browsed elsewhere
  exploredDestinations: Array<{
    destination: string;
    visitCount: number;
    signal: UserSignal;
  }>;
}
