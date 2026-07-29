import type { Airport } from '../types';

/** Group airports by first letter of city, sorted Z→A. */
export function groupAirportsByLetter(list: Airport[]) {
  const map = new Map<string, Airport[]>();
  for (const a of list) {
    const letter = a.city[0].toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(a);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([letter, data]) => ({
      title: letter,
      data: data.sort((a, b) => b.city.localeCompare(a.city)),
    }));
}

/** Fuzzy search — city / IATA / name, prefix matches first. */
export function searchAirports(query: string, list: Airport[]) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return list
    .filter(
      (a) =>
        a.city.toLowerCase().includes(q) ||
        a.iata.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const aPrefix = a.city.toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = b.city.toLowerCase().startsWith(q) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.city.localeCompare(b.city);
    });
}
