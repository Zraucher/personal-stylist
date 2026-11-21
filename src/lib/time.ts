// Clock helpers for server components (kept out of render bodies so React's purity lint stays happy).

/** ISO timestamp `days` ago. */
export const isoDaysAgo = (days: number): string => new Date(Date.now() - days * 86400000).toISOString();
/** True while a timestamp is still in the future. */
export const stillOpen = (iso: string): boolean => Date.parse(iso) > Date.now();
