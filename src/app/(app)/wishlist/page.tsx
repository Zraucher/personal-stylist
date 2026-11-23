import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { toCandidateView } from "./view";
import WishlistClient, { type CandidateView, type WishView } from "./WishlistClient";

export const metadata = { title: "Wishlist · valette" };

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ add?: string; prefs?: string }> }) {
  const { add, prefs } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  const [{ data: wishes }, { data: cands }, { data: needs }] = await Promise.all([
    supabase.from("wishlist").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
    supabase.from("wishlist_candidates").select("*").eq("user_id", uid).neq("state", "dismissed").order("created_at", { ascending: false }),
    supabase.from("upcoming_needs").select("id, label, season, status").eq("user_id", uid).order("created_at", { ascending: true }),
  ]);

  const wishViews: WishView[] = (wishes ?? []).map((w) => ({
    id: w.id as string,
    // Seeded entries carry planning labels like "Tier 1 shoes"; show just the piece.
    title: (((w.title as string | null) ?? (w.category as string)) || "Wish").replace(/^tier\s*\d+\s*/i, "") || "Wish",
    preferences: (w.preferences as string | null) ?? null,
    budget: (w.budget as string | null) ?? null,
    colors: Array.isArray(w.colors) ? (w.colors as string[]) : [],
    status: (w.status as "open" | "found" | "dropped") ?? "open",
    lastSearched: (w.last_searched_at as string | null) ?? null,
  }));
  const candViews: CandidateView[] = (cands ?? []).map(toCandidateView);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/hauls", label: "Shop" }}
        title="Wishlist"
        subtitle="Pieces you want and products you saved. Find options searches stores in your colors and from brands you love."
      />
      <WishlistClient
        wishes={wishViews}
        candidates={candViews}
        needs={(needs ?? []).map((n) => ({ id: n.id as string, label: n.label as string, season: (n.season as string | null) ?? null, status: n.status as string }))}
        prefill={add ? { title: add, preferences: prefs ?? "" } : null}
      />
    </div>
  );
}
