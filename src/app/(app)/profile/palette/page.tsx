import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveColor } from "@/lib/scorecard/rules";
import ShareCard from "./ShareCard";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Palette card</h1>
          <p className="text-sm text-stone-500">{(color?.season_label as string | null) ?? "Your best colors and the ones to use with care."}</p>
        </div>
        <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900">
          Edit colors
        </Link>
      </div>

      {best.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No best colors yet. Add them under Color on the <Link href="/profile" className="underline">Profile</Link> page.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-medium text-stone-500">Best colors</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {best.map((c) => (
                <div key={c.name} className="overflow-hidden rounded-lg border border-stone-200">
                  <div className="h-16" style={{ background: c.hex ?? "repeating-linear-gradient(45deg,#eee,#eee 6px,#fff 6px,#fff 12px)" }} />
                  <p className="truncate px-2 py-1 text-xs">{c.name}</p>
                </div>
              ))}
            </div>
          </section>
          {avoid.length > 0 && (
            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-medium text-stone-500">Use with care</h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {avoid.map((c) => (
                  <li key={c.name} className="flex items-center gap-1.5 rounded-full border border-stone-200 px-2.5 py-1">
                    {c.hex && <span className="h-3 w-3 rounded-full border border-stone-300" style={{ background: c.hex }} />}
                    {c.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ShareCard />
        </>
      )}
    </div>
  );
}
