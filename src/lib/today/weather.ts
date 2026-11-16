import "server-only";

// Open-Meteo: free, no key. Geocode the profile's city once, then read the hourly
// forecast and summarize only the hours the person will actually be outside.

export type HourWindow = "morning" | "midday" | "evening";
export const WINDOWS: Record<HourWindow, [number, number]> = { morning: [7, 11], midday: [11, 16], evening: [16, 22] };

export type WeatherSummary = {
  date: string;
  source: "forecast" | "stated" | "default";
  tempMin: number;
  tempMax: number;
  feelsMin: number;
  feelsMax: number;
  rainMax: number; // % chance
  uvMax: number;
  windMax: number; // mph
  hours: HourWindow[];
  place: string | null;
};

const US_STATES: Record<string, string> = Object.fromEntries(
  (
    "al alabama,ak alaska,az arizona,ar arkansas,ca california,co colorado,ct connecticut,de delaware,fl florida,ga georgia,hi hawaii,id idaho,il illinois,in indiana,ia iowa,ks kansas,ky kentucky,la louisiana,me maine,md maryland,ma massachusetts,mi michigan,mn minnesota,ms mississippi,mo missouri,mt montana,ne nebraska,nv nevada,nh new hampshire,nj new jersey,nm new mexico,ny new york,nc north carolina,nd north dakota,oh ohio,ok oklahoma,or oregon,pa pennsylvania,ri rhode island,sc south carolina,sd south dakota,tn tennessee,tx texas,ut utah,vt vermont,va virginia,wa washington,wv west virginia,wi wisconsin,wy wyoming,dc district of columbia"
  )
    .split(",")
    .map((s) => [s.slice(0, 2), s.slice(3)])
);

export async function geocode(location: string): Promise<{ latitude: number; longitude: number; timezone: string } | null> {
  const name = location.split(",")[0].trim();
  if (!name) return null;
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { results?: Array<{ latitude: number; longitude: number; timezone: string; admin1?: string; country_code?: string }> };
    const results = body.results ?? [];
    // Prefer a match whose state or country appears in the rest of the location ("Portland, ME").
    const tokens = location
      .slice(name.length)
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    const restText = tokens.join(" ");
    const states = tokens.map((t) => US_STATES[t]).filter(Boolean);
    const hit =
      results.find((x) => x.admin1 && (states.includes(x.admin1.toLowerCase()) || (restText.length > 2 && restText.includes(x.admin1.toLowerCase())))) ??
      results.find((x) => x.country_code && tokens.includes(x.country_code.toLowerCase())) ??
      results[0];
    return hit ? { latitude: hit.latitude, longitude: hit.longitude, timezone: hit.timezone } : null;
  } catch {
    return null;
  }
}

type Hourly = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  uv_index: number[];
  wind_speed_10m: number[];
};

export async function forecast(latitude: number, longitude: number): Promise<Hourly | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,uv_index,wind_speed_10m` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 1800 } });
    if (!r.ok) return null;
    const body = (await r.json()) as { hourly?: Hourly };
    return body.hourly ?? null;
  } catch {
    return null;
  }
}

/** Summarize the chosen hours of one local date. Returns null when the date is not in the forecast. */
export function summarize(h: Hourly, date: string, hours: HourWindow[], place: string | null): WeatherSummary | null {
  const use = hours.length ? hours : (["morning", "midday", "evening"] as HourWindow[]);
  const idx: number[] = [];
  h.time.forEach((t, i) => {
    if (!t.startsWith(date)) return;
    const hour = Number(t.slice(11, 13));
    if (use.some((w) => hour >= WINDOWS[w][0] && hour < WINDOWS[w][1])) idx.push(i);
  });
  if (!idx.length) return null;
  const pick = (arr: number[]) => idx.map((i) => arr[i]).filter((v) => typeof v === "number");
  const t = pick(h.temperature_2m);
  const f = pick(h.apparent_temperature);
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
  const min = (xs: number[]) => (xs.length ? Math.min(...xs) : 0);
  return {
    date,
    source: "forecast",
    tempMin: Math.round(min(t)),
    tempMax: Math.round(max(t)),
    feelsMin: Math.round(min(f)),
    feelsMax: Math.round(max(f)),
    rainMax: Math.round(max(pick(h.precipitation_probability))),
    uvMax: Math.round(max(pick(h.uv_index))),
    windMax: Math.round(max(pick(h.wind_speed_10m))),
    hours: use,
    place,
  };
}

/** A plain fallback when there is no forecast: the person's stated temperature, or a mild day. */
export function statedWeather(date: string, tempF: number | null, hours: HourWindow[], place: string | null): WeatherSummary {
  const t = tempF ?? 72;
  return {
    date,
    source: tempF == null ? "default" : "stated",
    tempMin: t - (tempF == null ? 6 : 0),
    tempMax: t,
    feelsMin: t - (tempF == null ? 6 : 0),
    feelsMax: t,
    rainMax: 0,
    uvMax: 0,
    windMax: 0,
    hours,
    place,
  };
}

/** YYYY-MM-DD in a timezone, offset by whole days. */
export function localDate(timezone: string | null, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone ?? "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
