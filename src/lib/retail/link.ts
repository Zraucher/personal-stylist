// Pure: find the product link in whatever a share sheet or a paste gives us, minus tracking junk.

const TRACKERS = /^(utm_\w+|fbclid|gclid|gbraid|wbraid|msclkid|mc_[ce]id|igshid|srsltid)$/i;

/** The first web link in the given texts as a clean https URL, or null. */
export function cleanLink(...parts: Array<string | null | undefined>): string | null {
  for (const part of parts) {
    const text = part?.trim();
    if (!text) continue;
    // A bare "store.com/shirt" paste counts; share sheets often send "Name https://…".
    const raw = text.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text) ? `https://${text}` : null);
    if (!raw) continue;
    try {
      const u = new URL(raw.replace(/[).,!?]+$/, ""));
      u.protocol = "https:";
      for (const k of [...u.searchParams.keys()]) if (TRACKERS.test(k)) u.searchParams.delete(k);
      u.hash = "";
      return u.toString();
    } catch {
      /* try the next part */
    }
  }
  return null;
}
