export type SetupStep = { id: "city" | "basics" | "palette"; label: string; href: string; done: boolean };

/** First-run checklist: what a new person still needs to do before the picks get good. */
export function setupSteps(p: { location: string | null; closetSize: number; hasPalette: boolean }, thin = 8): SetupStep[] {
  return [
    { id: "basics", label: "Tick the basics you own", href: "/closet/basics", done: p.closetSize >= thin },
    { id: "city", label: "Add your city for real weather", href: "/profile", done: !!p.location?.trim() },
    { id: "palette", label: "Find your colors", href: "/profile#color", done: p.hasPalette },
  ];
}
