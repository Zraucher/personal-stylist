// Clock helpers for server components (kept out of render bodies so React's purity lint stays happy).

/** ISO timestamp `days` ago. */
export const isoDaysAgo = (days: number): string => new Date(Date.now() - days * 86400000).toISOString();
/** True while a timestamp is still in the future. */
export const stillOpen = (iso: string): boolean => Date.parse(iso) > Date.now();

/** The hour (0-23) on the person's clock right now; Pacific when they have no time zone. */
export function localHour(timezone: string | null, now = Date.now()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone ?? "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(now));
  } catch {
    return new Date(now).getUTCHours();
  }
}
