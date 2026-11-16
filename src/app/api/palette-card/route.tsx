import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { resolveColor } from "@/lib/scorecard/rules";

// A 1080x1350 share image of the person's palette: best colors as swatches,
// cautions as a short list. First name only, no photo.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [{ data: profile }, { data: color }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("color_profiles").select("season_label, best_colors, avoid_colors").eq("user_id", user.id).maybeSingle(),
  ]);
  const strs = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
  const best = strs(color?.best_colors).map((name) => ({ name, hex: resolveColor({ name }) }));
  const swatches = best.filter((c): c is { name: string; hex: string } => !!c.hex).slice(0, 16);
  const unswatched = best.filter((c) => !c.hex).map((c) => c.name);
  const avoid = strs(color?.avoid_colors).slice(0, 8);
  const first = ((profile?.name as string | null) ?? "My").split(" ")[0];
  const season = (color?.season_label as string | null) ?? null;

  const text = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.5 ? "#fbf7f2" : "#1d1b2b";
  };

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fbf7f2", padding: 72, color: "#1d1b2b", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: "#6b6577" }}>my palette</div>
        <div style={{ display: "flex", flexShrink: 0, fontSize: 84, fontWeight: 800, marginTop: 12, lineHeight: 1.2, letterSpacing: -2 }}>{`${first}'s colors`}</div>
        {season && <div style={{ display: "flex", flexShrink: 0, fontSize: 34, marginTop: 20, lineHeight: 1.3, color: "#6b6577" }}>{season}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", flexShrink: 0, marginTop: 40, gap: 18 }}>
          {swatches.map((c) => (
            <div key={c.name} style={{ width: 216, height: 150, background: c.hex, borderRadius: 18, display: "flex", alignItems: "flex-end", padding: 16, border: "2px solid #ece4d9" }}>
              <div style={{ fontSize: 24, color: text(c.hex) }}>{c.name}</div>
            </div>
          ))}
        </div>
        {unswatched.length > 0 && <div style={{ fontSize: 28, marginTop: 28, color: "#3e3a4a" }}>{`Also: ${unswatched.join(", ")}`}</div>}
        {avoid.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div style={{ fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#9e432d" }}>use with care</div>
            <div style={{ fontSize: 32, marginTop: 10 }}>{avoid.join(" · ")}</div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800, color: "#1d1b2b", marginTop: avoid.length ? 32 : "auto" }}>valette<div style={{ width: 30, height: 30, borderRadius: 15, background: "#2f7d5b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbf7f2", fontSize: 20 }}>✓</div><div style={{ fontSize: 22, fontWeight: 400, color: "#6b6577", marginLeft: 12 }}>check it on you · myvallette.com</div></div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } }
  );
}
