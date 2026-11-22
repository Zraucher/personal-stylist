import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveColor } from "@/lib/scorecard/rules";
import ShareCard from "./ShareCard";
import { ButtonLink, Card, Chip, EmptyState, PageHeader, SectionTitle, Swatch } from "@/components/ui";

export default async function PalettePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: color } = await supabase.from("color_profiles").select("season_label, best_colors, avoid_colors").eq("user_id", user!.id).maybeSingle();
  const strs = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
  const best = strs(color?.best_colors).map((name) => ({ name, hex: resolveColor({ name }) }));
  const avoid = strs(color?.avoid_colors).map((name) => ({ name, hex: resolveColor({ name }) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Palette card"
        back={{ href: "/profile", label: "Profile" }}
        subtitle={(color?.season_label as string | null) ?? "Your best colors and the ones to use with care."}
        actions={
          <ButtonLink href="/profile" variant="quiet" size="sm">
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
              No best colors yet. Add them under Color on the{" "}
              <Link href="/profile" className="font-semibold underline underline-offset-2">
                Profile
              </Link>{" "}
              page.
            </>
          }
        />
      ) : (
        <>
          <Card as="section" className="space-y-3">
            <SectionTitle>Best colors</SectionTitle>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {best.map((c) => (
                <li key={c.name} className="overflow-hidden rounded-thumb bg-card ring-1 ring-line">
                  <div
                    aria-hidden="true"
                    className="h-16 shadow-[inset_0_-1px_0_var(--color-line)]"
                    style={{ background: c.hex ?? "repeating-linear-gradient(45deg,var(--color-inset),var(--color-inset) 6px,var(--color-card) 6px,var(--color-card) 12px)" }}
                  />
                  <p className="truncate px-2 py-1.5 text-xs font-medium">{c.name}</p>
                </li>
              ))}
            </ul>
          </Card>
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
          <ShareCard />
        </>
      )}
    </div>
  );
}
