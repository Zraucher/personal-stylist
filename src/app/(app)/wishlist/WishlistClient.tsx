"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addWish, deleteWish, setCandidateState, setWatch, setWishStatus, sourcingHaul, upcomingStatus } from "./actions";
import { priceDrop } from "@/lib/retail/price";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, Card, ChipButton, EmptyState, Field, Input, Notice, SectionTitle, Select, Thumb } from "@/components/ui";

export type WishView = { id: string; title: string; preferences: string | null; budget: string | null; colors: string[]; status: "open" | "found" | "dropped"; lastSearched: string | null };
export type CandidateView = {
  id: string;
  wishId: string;
  url: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  paletteStatus: string | null;
  paletteReason: string | null;
  state: string;
  colors: Array<{ name: string; hex?: string }>;
  watch: boolean;
  firstPrice: number | null;
};
type Need = { id: string; label: string; season: string | null; status: string };

const IN_PALETTE = new Set(["good", "ok"]);

export default function WishlistClient({ wishes, candidates, needs, prefill }: { wishes: WishView[]; candidates: CandidateView[]; needs: Need[]; prefill: { title: string; preferences: string } | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [prefs, setPrefs] = useState(prefill?.preferences ?? "");
  const [budget, setBudget] = useState("");
  const [colors, setColors] = useState("");
  const [cands, setCands] = useState<CandidateView[]>(candidates);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Watched prices refresh quietly when the page opens (the server skips any checked in the last 12 hours).
  useEffect(() => {
    if (!candidates.some((c) => c.watch)) return;
    let live = true;
    fetch("/api/wishlist/prices", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { updated?: Array<{ id: string; price: number | null }> } | null) => {
        if (!live || !b?.updated?.length) return;
        setCands((xs) => xs.map((x) => {
          const u = b.updated!.find((y) => y.id === x.id);
          return u ? { ...x, price: u.price ?? x.price } : x;
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [candidates]);

  const toggleWatch = async (c: CandidateView) => {
    const r = await setWatch(c.id, !c.watch);
    if (!r.ok) return setError(r.error);
    setCands((xs) => xs.map((x) => (x.id === c.id ? { ...x, watch: !c.watch, state: !c.watch ? "saved" : x.state, firstPrice: x.firstPrice ?? x.price } : x)));
  };

  const add = async () => {
    setError(null);
    const r = await addWish({ title, preferences: prefs, budget, colors: colors.split(",").map((c) => c.trim()).filter(Boolean) });
    if (!r.ok) return setError(r.error);
    setTitle("");
    setPrefs("");
    setBudget("");
    setColors("");
    router.refresh();
  };

  const find = async (w: WishView) => {
    setBusy(w.id);
    setError(null);
    setNotes((n) => ({ ...n, [w.id]: "Searching stores and reading product photos. This takes up to a minute." }));
    try {
      const res = await fetch("/api/wishlist/source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wishlistId: w.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "The search failed.");
      const fresh: CandidateView[] = (body.candidates ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        wishId: w.id,
        url: c.url as string,
        name: (c.name as string | null) ?? null,
        brand: (c.brand as string | null) ?? null,
        imageUrl: (c.image_url as string | null) ?? null,
        price: c.price != null ? Number(c.price) : null,
        paletteStatus: (c.palette_status as string | null) ?? null,
        paletteReason: (c.palette_reason as string | null) ?? null,
        state: (c.state as string) ?? "new",
        colors: Array.isArray(c.colors) ? (c.colors as CandidateView["colors"]) : [],
        watch: !!c.watch,
        firstPrice: c.first_price != null ? Number(c.first_price) : null,
      }));
      setCands((xs) => [...fresh, ...xs.filter((x) => !fresh.some((f) => f.id === x.id))]);
      const inPal = fresh.filter((f) => IN_PALETTE.has(f.paletteStatus ?? "")).length;
      setNotes((n) => ({ ...n, [w.id]: body.note ?? `${fresh.length} products read, ${inPal} in your palette. Searched with: ${(body.queries ?? []).join(" · ")}` }));
    } catch (e) {
      setNotes((n) => ({ ...n, [w.id]: e instanceof Error ? e.message : "The search failed." }));
    } finally {
      setBusy(null);
    }
  };

  const review = async (c: CandidateView) => {
    setBusy(c.id);
    const h = await sourcingHaul(c.wishId);
    if (!h.ok || !h.id) {
      setBusy(null);
      return setError(h.ok ? "Could not open a haul" : h.error);
    }
    await fetch("/api/haul/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ haulId: h.id, url: c.url }) });
    router.push(`/hauls/${h.id}`);
  };

  const candState = async (c: CandidateView, state: "saved" | "dismissed") => {
    const r = await setCandidateState(c.id, state);
    if (!r.ok) return setError(r.error);
    setCands((xs) => (state === "dismissed" ? xs.filter((x) => x.id !== c.id) : xs.map((x) => (x.id === c.id ? { ...x, state } : x))));
  };

  return (
    <div className="space-y-6">
      <Card as="section" className="space-y-4">
        <SectionTitle>Add a wish</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. tooled leather belt" maxLength={80} />
          </Field>
          <Field label="Colors (optional)">
            <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Comma separated" />
          </Field>
          <Field label="Details that matter" className="sm:col-span-2">
            <Input value={prefs} onChange={(e) => setPrefs(e.target.value)} maxLength={400} />
          </Field>
          <Field label="Budget (optional)">
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={40} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="primary" onClick={add} disabled={!title.trim()} block>
              Add to wishlist
            </Button>
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>

      {wishes.length === 0 && <EmptyState compact title="Nothing on the wishlist yet." />}

      {wishes.map((w) => {
        const mine = cands.filter((c) => c.wishId === w.id);
        const visible = showAll[w.id] ? mine : mine.filter((c) => IN_PALETTE.has(c.paletteStatus ?? "") || c.state === "saved");
        return (
          <Card as="section" key={w.id} className={"space-y-4 " + (w.status === "open" ? "" : "opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <h3 className="font-display text-lg font-bold leading-snug capitalize">{w.title}</h3>
                {w.preferences && <p className="text-sm text-stone-600">{w.preferences}</p>}
                <p className="text-xs text-stone-500">
                  {[w.budget && `Budget: ${w.budget}`, w.colors.length ? `Colors: ${w.colors.join(", ")}` : null, w.lastSearched && `Last searched ${new Date(w.lastSearched).toLocaleDateString()}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => find(w)} disabled={busy === w.id} aria-busy={busy === w.id}>
                  {busy === w.id ? "Searching…" : "Find options"}
                </Button>
                <div className="w-32">
                <Select
                  value={w.status}
                  onChange={async (e) => {
                    const r = await setWishStatus(w.id, e.target.value as WishView["status"]);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  }}
                  aria-label={`Status of ${w.title}`}
                >
                  <option value="open">Open</option>
                  <option value="found">Found</option>
                  <option value="dropped">Dropped</option>
                </Select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await deleteWish(w.id);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  }}
                  className="tap inline-flex size-11 items-center justify-center rounded-full text-stone-500 transition-colors duration-200 ease-soft hover:bg-red-100 hover:text-red-700"
                  aria-label={`Delete ${w.title}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>
            {notes[w.id] && (
              <p role="status" aria-live="polite" className="text-xs text-stone-500">
                {notes[w.id]}
              </p>
            )}
            {visible.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visible.map((c) => {
                  const inPal = IN_PALETTE.has(c.paletteStatus ?? "");
                  const drop = c.watch ? priceDrop(c.firstPrice, c.price) : null;
                  return (
                    <Card key={c.id} pad="none" className="flex min-w-0 flex-col overflow-hidden">
                      <a href={c.url} target="_blank" rel="noreferrer" className="block p-2 pb-0">
                        <Thumb src={c.imageUrl} alt={c.name ?? "Product"} product />
                      </a>
                      <div className="flex flex-1 flex-col gap-1 p-3 text-xs">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.name ?? c.url}</p>
                        <p className="tabular-nums text-stone-500">{[c.brand, c.price != null ? `$${c.price.toFixed(2)}` : null].filter(Boolean).join(" · ")}</p>
                        {drop ? (
                          <p className="font-medium text-emerald-800">
                            Down ${drop.amount.toFixed(2)} ({drop.percent}%) since you started watching
                          </p>
                        ) : c.watch ? (
                          <p className="text-stone-500">Watching the price</p>
                        ) : null}
                        {c.paletteReason && (
                          <p className={inPal ? "text-emerald-800" : "text-amber-800"}>
                            <span className="font-semibold">{inPal ? "In your palette" : "Outside your palette"}:</span> {c.paletteReason}
                          </p>
                        )}
                        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                          <Button type="button" size="sm" onClick={() => review(c)} disabled={busy === c.id} aria-busy={busy === c.id}>
                            {busy === c.id ? "Reviewing…" : "Full review"}
                          </Button>
                          {c.state !== "saved" && (
                            <Button type="button" variant="quiet" size="sm" onClick={() => candState(c, "saved")}>
                              Save
                            </Button>
                          )}
                          {c.price != null && (
                            <ChipButton selected={c.watch} onClick={() => toggleWatch(c)}>
                              {c.watch ? "Watching" : "Watch price"}
                            </ChipButton>
                          )}
                          <Button type="button" variant="quiet" size="sm" onClick={() => candState(c, "dismissed")}>
                            Dismiss
                          </Button>
                          <AskFriendsButton target={{ kind: "find", candidateId: c.id }} compact />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {mine.length > visible.length && (
              <Button type="button" variant="quiet" size="sm" onClick={() => setShowAll((s) => ({ ...s, [w.id]: !s[w.id] }))} className="-ml-3.5">
                {showAll[w.id] ? "Show only in-palette" : `Show ${mine.length - visible.length} outside your palette`}
              </Button>
            )}
          </Card>
        );
      })}

      {needs.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Coming up</SectionTitle>
          <ul className="divide-y divide-line rounded-card bg-card px-4 ring-1 ring-line">
            {needs.map((n) => (
              <li key={n.id} className="flex min-h-14 items-center justify-between gap-3 py-2 text-[15px]">
                <span className="min-w-0">
                  {n.label}
                  {n.season && <span className="ml-2 text-sm text-stone-500">{n.season}</span>}
                </span>
                <div className="w-32 shrink-0">
                <Select
                  defaultValue={n.status}
                  onChange={async (e) => {
                    const r = await upcomingStatus(n.id, e.target.value as "open" | "styled" | "done");
                    if (!r.ok) setError(r.error);
                  }}
                  aria-label={`Status of ${n.label}`}
                >
                  <option value="open">Open</option>
                  <option value="styled">Styled</option>
                  <option value="done">Done</option>
                </Select>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
