// Browser side: where the person is right now, for the forecast. Never stored.

export type Here = { latitude: number; longitude: number };

// About a kilometer: enough for a forecast, and the precise spot never leaves the device.
const round = (n: number) => Math.round(n * 100) / 100;

/** Asks the browser (it prompts the first time). null on no, no answer within 15s, or no support. */
export function whereAmI(): Promise<Here | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 15000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({ latitude: round(p.coords.latitude), longitude: round(p.coords.longitude) });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 10000 }
    );
  });
}

/** Only if the person already said yes, so a page can use it on load without a prompt. */
export async function whereAmIIfAllowed(): Promise<Here | null> {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" });
    return p?.state === "granted" ? whereAmI() : null;
  } catch {
    return null;
  }
}
