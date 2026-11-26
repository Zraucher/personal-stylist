export const NAME_TIMEOUT_MS = 8000;

/**
 * Short AI names for outfits that came from the rule-based fallback, in one call.
 * `ask` gets one description per outfit and returns one name per outfit. Any error,
 * timeout or empty name keeps that outfit's plain name, so naming can never block a recommendation.
 */
export async function nameFallbackOutfits(
  plain: string[],
  descriptions: string[],
  ask: (descriptions: string[]) => Promise<string[]>,
  timeoutMs = NAME_TIMEOUT_MS
): Promise<string[]> {
  if (!plain.length) return plain;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const names = await Promise.race([
      ask(descriptions),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("naming timed out")), timeoutMs);
      }),
    ]);
    return plain.map((p, i) => (typeof names[i] === "string" && names[i].trim() ? names[i].trim().slice(0, 60) : p));
  } catch {
    return plain;
  } finally {
    clearTimeout(timer);
  }
}
