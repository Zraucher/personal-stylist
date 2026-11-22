import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveColor } from "@/lib/scorecard/rules";
import ShareCard from "./ShareCard";
import { ButtonLink, Card, Chip, EmptyState, PageHeader, SectionTitle, Swatch } from "@/components/ui";

export const metadata = { title: "Palette card · valette" };

export default async function PalettePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: color } = await supabase.from("color_profiles").select("season_label, best_colors, avoid_colors").eq("user_id", user!.id).maybeSingle();
  const strs = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
  const best = strs(color?.best_colors).map((name) => ({ name, hex: resolveColor({ name }) }));
  const avoid = strs(color?.avoid_colors).map((name) => ({ name, hex: resolveColor({ name }) }));
  const season = (color?.season_label as string | null) ?? null;
  const shareAlt = `${season ? `${season} palette` : "Palette"} card. Best colors: ${best.map((c) => c.name).join(", ")}.${avoid.length ? ` Use with care: ${avoid.map((c) => c.name).join(", ")}.` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Palette card"
        back={{ href: "/profile", label: "Profile" }}
        subtitle={(color?.season_label as string | null) ?? "Your best colors and the ones to use with care."}
        actions={
          <ButtonLink href="/profile#color" variant="quiet" size="sm">
            Edit colors
          </ButtonLink>
        }
      />

      {best.length === 0 ? (
        <EmptyState
          compact
          title="No best colors yet"
          body={
            <>
              Add your best colors under Color on the{" "}
              <Link href="/profile" className="font-semibold underline underline-offset-2">
                Profile
              </Link>{" "}
              page.
            </>
          }
        />
      ) : (
        <>
          <ShareCard alt={shareAlt} />
          <section className="space-y-3" aria-labelledby="best-title">
            <SectionTitle>
              <span id="best-title">Best colors</span>
            </SectionTitle>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {best.map((c) => (
                <li key={c.name} className="space-y-1.5">
                  <div
                    aria-hidden="true"
                    className="h-28 rounded-thumb ring-1 ring-inset ring-line sm:h-36"
                    style={{ background: c.hex ?? "repeating-linear-gradient(45deg,var(--color-inset),var(--color-inset) 6px,var(--color-card) 6px,var(--color-card) 12px)" }}
                  />
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{c.name}</p>
                </li>
              ))}
            </ul>
          </section>
          {avoid.length > 0 && (
            <Card as="section" className="space-y-3">
              <SectionTitle>Use with care</SectionTitle>
              <ul className="flex flex-wrap gap-2 text-sm">
                {avoid.map((c) => (
                  <li key={c.name}>
                    <Chip tone="outline" size="md">
                      {c.hex && <Swatch hex={c.hex} />}
                      {c.name}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
