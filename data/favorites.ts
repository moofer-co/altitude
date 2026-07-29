/**
 * Saved destinations — shared across Explore cards, destination sheet, and Saved tab.
 */

import { destinations, type Destination } from './destinations';

export type SavedEntry = {
  id: string;
  savedAt: number;
  /** Optional note the traveller left on the Saved page. */
  note: string;
};

let store: SavedEntry[] = [
  // Seed a couple so Saved isn't empty on first open
  { id: 'goa', savedAt: Date.now() - 86400000 * 2, note: '' },
  { id: 'jaipur', savedAt: Date.now() - 86400000, note: 'Long weekend' },
];

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFavoriteIds(): string[] {
  return store.map((e) => e.id);
}

export function getFavorites(): SavedEntry[] {
  return store.map((e) => ({ ...e }));
}

export function isFavorite(id: string): boolean {
  return store.some((e) => e.id === id);
}

export function toggleFavorite(id: string): boolean {
  if (isFavorite(id)) {
    store = store.filter((e) => e.id !== id);
    notify();
    return false;
  }
  store = [{ id, savedAt: Date.now(), note: '' }, ...store];
  notify();
  return true;
}

export function removeFavorite(id: string) {
  store = store.filter((e) => e.id !== id);
  notify();
}

export function setFavoriteNote(id: string, note: string) {
  store = store.map((e) => (e.id === id ? { ...e, note } : e));
  notify();
}

export function clearFavorites() {
  store = [];
  notify();
}

export function favoriteDestinations(): Array<Destination & { savedAt: number; note: string }> {
  return store
    .map((e) => {
      const d = destinations.find((x) => x.id === e.id);
      if (!d) return null;
      return { ...d, savedAt: e.savedAt, note: e.note };
    })
    .filter(Boolean) as Array<Destination & { savedAt: number; note: string }>;
}
