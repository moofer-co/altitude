/**
 * Lightweight mock weather for UI.
 * Deterministic per place so the same city always shows the same condition.
 */

export type WeatherKind =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'fog';

export type WeatherSnapshot = {
  kind: WeatherKind;
  /** Display label — matches product copy (Cloudy, not Claudy). */
  label: string;
  tempC: number;
};

const LABELS: Record<WeatherKind, string> = {
  sunny: 'Sunny',
  partlyCloudy: 'Cloudy',
  cloudy: 'Cloudy',
  rain: 'Raining',
  storm: 'Storm',
  fog: 'Foggy',
};

const KINDS: WeatherKind[] = [
  'sunny',
  'partlyCloudy',
  'cloudy',
  'rain',
  'storm',
  'fog',
  'sunny',
  'partlyCloudy',
  'cloudy',
  'rain',
];

function hash(key: string): number {
  let h = 0;
  const s = key.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Weather for any city / IATA key. */
export function weatherFor(placeKey: string): WeatherSnapshot {
  const h = hash(placeKey || 'DEL');
  const kind = KINDS[h % KINDS.length];
  const tempC = 18 + (h % 18); // 18–35°C
  return { kind, label: LABELS[kind], tempC };
}

/** Home greeting weather — tied to the current origin city. */
export function homeWeather(originCity: string, originIata: string): WeatherSnapshot {
  return weatherFor(`${originCity}-${originIata}`);
}
