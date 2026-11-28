"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addWish, deleteWish, setCandidateState, setTarget, setWatch, setWishStatus, sourcingHaul, upcomingStatus } from "./actions";
import type { Advice } from "@/lib/retail/advice";
import { priceDrop, saleOff } from "@/lib/retail/price";
import { SIZING_LABEL } from "@/lib/retail/sizing";
import { toCandidateView } from "./view";
import MoonsiftImportToggle from "./MoonsiftImport";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, Card, Chip, ChipButton, ConfirmButton, EmptyState, Field, Input, Notice, SectionTitle, Select, Skeleton, Thumb } from "@/components/ui";

export type WishView = { id: string; title: string; preferences: string | null; budget: string | null; colors: string[]; status: "open" | "found" | "dropped"; lastSearched: string | null };
export type CandidateView = {
  id: string;
  wishId: string | null;
  url: string;
  name: string | null;
  brand: string | null;
  source: string | null;
  imageUrl: string | null;
  price: number | null;
  paletteStatus: string | null;
  paletteReason: string | null;
  state: string;
  colors: Array<{ name: string; hex?: string }>;
  watch: boolean;
  firstPrice: number | null;
  listPrice: number | null;
  targetPrice: number | null;
  lowest: number | null;
  advice: Advice | null;
};
type Need = { id: string; label: string; season: string | null; status: string };

const IN_PALETTE = new Set(["good", "ok"]);
const OUT_PALETTE = new Set(["caution", "fail"]);
const SIGNED_OUT = "You're signed out. Sign in again to save this.";

const summaryClass =
  "tap inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-full px-1.5 text-sm font-medium text-stone-600 transition-colors duration-200 ease-soft hover:text-stone-900 [&::-webkit-details-marker]:hidden";

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-200 ease-soft group-open:rotate-180">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Loading shape of a found product while the search runs. */
function CandidateSkeleton() {
  return (
    <li aria-hidden="true" className="flex min-w-0 flex-col overflow-hidden rounded-card bg-card ring-1 ring-line">
      <div className="p-2 pb-0">
        <Skeleton className="aspect-[4/5] rounded-thumb" />
      </div>
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </li>
  );
}
const STATUS_CHIP: Record<WishView["status"], { label: string; tone: "neutral" | "outline" } | null> = {
  open: null,
  found: { label: "Found", tone: "neutral" },
  dropped: { label: "Dropped", tone: "outline" },
};

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

const VERDICT: Record<Advice["verdict"], { tone: "works" | "almost" | "not"; mark: string; label: string }> = {
  buy: { tone: "works", mark: "✓", label: "worth buying" },
  wait: { tone: "almost", mark: "◐", label: "wait" },
  skip: { tone: "not", mark: "✕", label: "skip it" },
};

/** The "Should I buy it?" answer: verdict, sizing from reviews, price. */
function AdviceNote({ a }: { a: Advice }) {
  const v = VERDICT[a.verdict];
  const size = SIZING_LABEL[a.sizing];
  return (
    <div className="space-y-1.5 rounded-control bg-inset p-2.5 text-xs leading-relaxed text-stone-700">
      <Chip tone={v.tone}>
        <span aria-hidden="true">{v.mark}</span> {v.label}
      </Chip>
      <p className="text-sm font-semibold leading-snug text-stone-900">{a.headline}</p>
      <p>
        <span className="font-semibold text-stone-900">{size ?? "Sizing"}.</span> {a.sizingNote}
      </p>
      <p>
        <span className="font-semibold text-stone-900">Price.</span> {a.price}
      </p>
      <details className="group">
        <summary className={summaryClass}>
          Why
          <Chevron />
        </summary>
        <div className="space-y-1 pt-1">
          <p>{a.fit}</p>
          {a.pros.length > 0 && <p>Reviewers like: {a.pros.join(", ")}.</p>}
          {a.cons.length > 0 && <p>Reviewers warn: {a.cons.join(", ")}.</p>}
          <p className="text-stone-500">{a.reviewsRead > 0 ? `From ${a.reviewsRead} review ${a.reviewsRead === 1 ? "remark" : "remarks"} we could read.` : "We couldn't read any reviews for this one."}</p>
        </div>
      </details>
    </div>
  );
}

export default function WishlistClient({ wishes, candidates, needs, prefill }: { wishes: WishView[]; candidates: CandidateView[]; needs: Need[]; prefill: { title: string; preferences: string } | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [prefs, setPrefs] = useState(prefill?.preferences ?? "");
  const [budget, setBudget] = useState("");
  const [colors, setColors] = useState("");
  const [cands, setCands] = useState<CandidateView[]>(candidates);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  // Errors live next to what caused them: "add", "needs", or a wish id.
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const fail = (key: string, msg: string | null) => setErrors((e) => ({ ...e, [key]: msg }));

  // When the page opens, watched prices refresh (the server skips any checked in the last 12 hours) and imported
  // products get their palette check. Each call does a small batch; keep calling while the server says more remain.
  useEffect(() => {
    let live = true;
    // shortcut: at most 40 calls per page open (240 prices, 160 photos); the rest continue on the next visit.
    const drain = async <U extends { id: string }>(url: string, apply: (u: U) => Partial<CandidateView>) => {
      for (let i = 0; i < 40 && live; i++) {
        const b: { updated?: U[]; remaining?: number } | null = await fetch(url, { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (!live || !b?.updated?.length) return;
        const byId = new Map(b.updated.map((u) => [u.id, u]));
        setCands((xs) => xs.map((x) => (byId.has(x.id) ? { ...x, ...apply(byId.get(x.id)!) } : x)));
        if (!b.remaining) return;
      }
    };
    if (candidates.some((c) => c.watch)) void drain<{ id: string; price: number | null }>("/api/wishlist/prices", (u) => (u.price != null ? { price: u.price } : {}));
    if (candidates.some((c) => c.paletteStatus == null && c.imageUrl))
      void drain<{ id: string; colors: CandidateView["colors"]; palette_status: string; palette_reason: string }>("/api/wishlist/palette", (u) => ({ colors: u.colors, paletteStatus: u.palette_status, paletteReason: u.palette_reason }));
    return () => {
      live = false;
    };
  }, [candidates]);

  // Errors for a saved product (no wish) show in the saved section.
  const key = (c: CandidateView) => c.wishId ?? "saved";

  const toggleWatch = async (c: CandidateView) => {
    fail(key(c), null);
    const r = await setWatch(c.id, !c.watch);
    if (!r.ok) return fail(key(c), r.error);
    setCands((xs) => xs.map((x) => (x.id === c.id ? { ...x, watch: !c.watch, state: !c.watch ? "saved" : x.state, firstPrice: x.firstPrice ?? x.price } : x)));
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    fail("add", null);
    const r = await addWish({ title, preferences: prefs, budget, colors: colors.split(",").map((c) => c.trim()).filter(Boolean) });
    setAdding(false);
    if (!r.ok) return fail("add", r.error);
    setTitle("");
    setPrefs("");
    setBudget("");
    setColors("");
    router.refresh();
  };

  const find = async (w: WishView) => {
    setBusy(w.id);
    fail(w.id, null);
    setNotes((n) => ({ ...n, [w.id]: "Searching stores and reading product photos. It takes up to a minute." }));
    try {
      const res = await fetch("/api/wishlist/source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wishlistId: w.id }) });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error(SIGNED_OUT);
      if (res.status === 404) throw new Error("That wish isn't here anymore. Refresh the page.");
      if (!res.ok) throw new Error(body.detail || "Couldn't search stores just now. Try again in a minute.");
      const fresh: CandidateView[] = (body.candidates ?? []).map(toCandidateView);
      setCands((xs) => [...fresh, ...xs.filter((x) => !fresh.some((f) => f.id === x.id))]);
      const inPal = fresh.filter((f) => IN_PALETTE.has(f.paletteStatus ?? "")).length;
      setNotes((n) => ({ ...n, [w.id]: body.note ?? `Read ${fresh.length} ${fresh.length === 1 ? "product" : "products"}, ${inPal} in your palette. We searched for ${(body.queries ?? []).join(" · ")}.` }));
    } catch (e) {
      setNotes((n) => ({ ...n, [w.id]: "" }));
      fail(w.id, e instanceof Error ? e.message : "Couldn't search stores just now. Try again in a minute.");
    } finally {
      setBusy(null);
    }
  };

  const review = async (c: CandidateView) => {
    setBusy(c.id);
    fail(key(c), null);
    try {
      const h = await sourcingHaul(c.wishId);
      if (!h.ok || !h.id) throw new Error(h.ok ? "Couldn't open a haul for this. Try again." : h.error);
      const res = await fetch("/api/haul/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ haulId: h.id, url: c.url }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(res.status === 401 ? SIGNED_OUT : body.detail || "Couldn't review this product. Try again.");
      }
      router.push(`/hauls/${h.id}`);
    } catch (e) {
      fail(key(c), e instanceof Error ? e.message : "Couldn't review this product. Try again.");
      setBusy(null);
    }
  };

  const advise = async (c: CandidateView) => {
    setBusy(`adv:${c.id}`);
    fail(key(c), null);
    try {
      const res = await fetch("/api/wishlist/advise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? SIGNED_OUT : body.detail || "Couldn't review this product. Try again.");
      const fresh = toCandidateView(body.candidate);
      setCands((xs) => xs.map((x) => (x.id === c.id ? fresh : x)));
    } catch (e) {
      fail(key(c), e instanceof Error ? e.message : "Couldn't review this product. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const saveTarget = async (c: CandidateView, raw: string) => {
    fail(key(c), null);
    const target = raw.trim() ? Number(raw.replace(/[$,\s]/g, "")) : null;
    const r = await setTarget(c.id, target);
    if (!r.ok) return fail(key(c), r.error);
    setCands((xs) => xs.map((x) => (x.id === c.id ? { ...x, targetPrice: target, ...(target != null ? { watch: true, state: "saved", firstPrice: x.firstPrice ?? x.price } : {}) } : x)));
  };

  const candState = async (c: CandidateView, state: "saved" | "dismissed") => {
    fail(key(c), null);
    const r = await setCandidateState(c.id, state);
    if (!r.ok) return fail(key(c), r.error);
    setCands((xs) => (state === "dismissed" ? xs.filter((x) => x.id !== c.id) : xs.map((x) => (x.id === c.id ? { ...x, state } : x))));
  };

  const card = (c: CandidateView) => {
    const inPal = IN_PALETTE.has(c.paletteStatus ?? "");
    const outPal = OUT_PALETTE.has(c.paletteStatus ?? "");
    const drop = c.watch ? priceDrop(c.firstPrice, c.price) : null;
    const off = saleOff(c.listPrice, c.price);
    const atTarget = c.targetPrice != null && c.price != null && c.price <= c.targetPrice;
    return (
      <Card as="li" key={c.id} pad="none" className="flex min-w-0 flex-col overflow-hidden">
        <a href={c.url} target="_blank" rel="noreferrer" className="block p-2 pb-0">
          <Thumb src={c.imageUrl} alt={`${c.name ?? "Product"} (opens the store in a new tab)`} product />
        </a>
        <div className="flex flex-1 flex-col gap-1 p-3 text-xs">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.name ?? c.url}</p>
          <p className="tabular-nums text-stone-500">{[c.brand, c.price != null ? `$${c.price.toFixed(2)}` : null, off ? `was $${c.listPrice!.toFixed(2)}` : null].filter(Boolean).join(" · ")}</p>
          {c.source && <p className="text-stone-500">From {c.source}</p>}
          {(drop || off || atTarget || inPal || outPal) && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {drop && (
                <Chip tone="almost">
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Down</span> ${drop.amount.toFixed(2)} ({drop.percent}%)
                </Chip>
              )}
              {atTarget && <Chip tone="almost">At your price</Chip>}
              {off && <Chip tone="almost">On sale, {off}% off</Chip>}
              {inPal && <Chip tone="outline">✓ in palette</Chip>}
              {outPal && <Chip tone="outline">outside your palette</Chip>}
            </div>
          )}
          {!drop && c.watch && <p className="text-stone-500">{c.targetPrice != null && !atTarget ? `Watching for $${c.targetPrice.toFixed(2)}` : "Watching the price"}</p>}
          {c.advice && <AdviceNote a={c.advice} />}
          <div className="mt-auto space-y-1.5 pt-2">
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" onClick={() => advise(c)} disabled={busy === `adv:${c.id}`} aria-busy={busy === `adv:${c.id}`}>
                {busy === `adv:${c.id}` ? "Reading reviews…" : c.advice ? "Check again" : "Should I buy it?"}
              </Button>
              {c.state === "saved" ? (
                <Chip tone="neutral" className="self-center">
                  Saved
                </Chip>
              ) : (
                <Button type="button" variant="quiet" size="sm" onClick={() => candState(c, "saved")}>
                  Save
                </Button>
              )}
            </div>
            <details className="group">
              <summary className={summaryClass}>
                More
                <Chevron />
              </summary>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {c.paletteReason && <p className="basis-full text-xs leading-relaxed text-stone-600">{c.paletteReason}</p>}
                {drop && <p className="basis-full text-xs text-stone-600">Down since you started watching.</p>}
                {c.price != null && (
                  <ChipButton selected={c.watch} onClick={() => toggleWatch(c)}>
                    {c.watch ? "Watching price" : "Watch price"}
                  </ChipButton>
                )}
                {c.lowest != null && c.price != null && c.lowest < c.price && <p className="basis-full text-xs text-stone-600">Lowest we&apos;ve seen: ${c.lowest.toFixed(2)}.</p>}
                {c.price != null && (
                  <form
                    className="flex basis-full items-end gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveTarget(c, String(new FormData(e.currentTarget).get("target") ?? ""));
                    }}
                  >
                    <Field label="Tell me at this price" className="min-w-0 flex-1">
                      <Input name="target" inputMode="decimal" placeholder={`e.g. ${Math.floor(c.price * 0.8)}`} defaultValue={c.targetPrice ?? ""} />
                    </Field>
                    <Button type="submit" size="md">
                      Set
                    </Button>
                  </form>
                )}
                <Button type="button" variant="quiet" size="sm" onClick={() => review(c)} disabled={busy === c.id} aria-busy={busy === c.id}>
                  {busy === c.id ? "Reviewing…" : "Full review"}
                </Button>
                <AskFriendsButton target={{ kind: "find", candidateId: c.id }} compact />
                <Button type="button" variant="quiet" size="sm" onClick={() => candState(c, "dismissed")}>
                  {c.wishId ? "Dismiss" : "Remove"}
                </Button>
              </div>
            </details>
          </div>
        </div>
      </Card>
    );
  };

  const saved = cands.filter((c) => !c.wishId);

  return (
    <div className="space-y-6">
      <section id="saved" className="scroll-mt-20 space-y-3" aria-labelledby="saved-title">
        <SectionTitle>
          <span id="saved-title">Saved products</span>
        </SectionTitle>
        <form action="/save" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Save a product from any store" className="min-w-0 flex-1">
            <Input name="url" placeholder="Paste a product link" inputMode="url" autoComplete="off" required />
          </Field>
          <Button type="submit">Save</Button>
        </form>
        <p className="text-xs text-stone-500">
          We keep the photo and price, check it against your palette and watch for price drops.{" "}
          <a href="/save" className="font-medium text-stone-700 underline underline-offset-2">
            Save from your phone or browser
          </a>
        </p>
        <MoonsiftImportToggle />
        {errors.saved && <Notice tone="error">{errors.saved}</Notice>}
        {saved.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{saved.map(card)}</ul>}
      </section>

      <Card as="form" onSubmit={add} aria-labelledby="add-wish-title" className="space-y-4">
        <h2 id="add-wish-title" className="font-display text-xl font-bold leading-tight">
          Add a wish
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="What" className="min-w-0 flex-1">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. tooled leather belt" maxLength={80} required />
          </Field>
          <Button type="submit" variant="primary" disabled={!title.trim() || adding} aria-busy={adding || undefined}>
            {adding ? "Adding…" : "Add to wishlist"}
          </Button>
        </div>
        <details className="group" open={!!prefill?.preferences || undefined}>
          <summary className={summaryClass}>
            Add details
            <Chevron />
          </summary>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Field label="Colors (optional)">
              <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Comma separated" />
            </Field>
            <Field label="Budget (optional)">
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={40} />
            </Field>
            <Field label="Details that matter (optional)" className="sm:col-span-2">
              <Input value={prefs} onChange={(e) => setPrefs(e.target.value)} maxLength={400} />
            </Field>
          </div>
        </details>
        {errors.add && <Notice tone="error">{errors.add}</Notice>}
      </Card>

      <section className="space-y-4" aria-labelledby="wishes-title">
        <SectionTitle>
          <span id="wishes-title">Your wishes</span>
        </SectionTitle>
        {wishes.length === 0 && <EmptyState compact title="Nothing on your wishlist yet. Add a piece you're after above." />}

        {wishes.map((w) => {
          const mine = cands.filter((c) => c.wishId === w.id);
          const visible = showAll[w.id] ? mine : mine.filter((c) => IN_PALETTE.has(c.paletteStatus ?? "") || c.state === "saved");
          const chip = STATUS_CHIP[w.status];
          return (
            // Unframed so the candidate cards are the only surfaces (no cards inside cards).
            <section key={w.id} aria-labelledby={`wish-${w.id}`} className="space-y-3 border-t border-line pt-4 first-of-type:border-t-0 first-of-type:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id={`wish-${w.id}`} className="font-display text-lg font-bold leading-snug capitalize">
                      {w.title}
                    </h3>
                    {chip && <Chip tone={chip.tone}>{chip.label}</Chip>}
                  </div>
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
                        fail(w.id, null);
                        const r = await setWishStatus(w.id, e.target.value as WishView["status"]);
                        if (!r.ok) fail(w.id, r.error);
                        else router.refresh();
                      }}
                      aria-label={`Status of ${w.title}`}
                    >
                      <option value="open">Open</option>
                      <option value="found">Found</option>
                      <option value="dropped">Dropped</option>
                    </Select>
                  </div>
                  <ConfirmButton
                    title={`Delete "${w.title}"?`}
                    body="The options we found for it go too. This can't be undone."
                    confirmLabel="Delete"
                    onConfirm={async () => {
                      fail(w.id, null);
                      const r = await deleteWish(w.id);
                      if (!r.ok) fail(w.id, r.error);
                      else router.refresh();
                    }}
                    variant="danger"
                    size="md"
                    className="w-11! px-0!"
                  >
                    <TrashIcon />
                    <span className="sr-only">Delete {w.title}</span>
                  </ConfirmButton>
                </div>
              </div>
              {errors[w.id] && <Notice tone="error">{errors[w.id]}</Notice>}
              <p role="status" aria-live="polite" className="text-xs text-stone-500 empty:hidden">
                {notes[w.id]}
              </p>
              {busy === w.id && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <CandidateSkeleton key={i} />
                  ))}
                </ul>
              )}
              {visible.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visible.map(card)}
                </ul>
              )}
              {mine.length > visible.length && (
                <Button type="button" variant="quiet" size="sm" onClick={() => setShowAll((s) => ({ ...s, [w.id]: !s[w.id] }))} className="-ml-3.5">
                  {showAll[w.id] ? "Show only in your palette" : `Show ${mine.length - visible.length} outside your palette`}
                </Button>
              )}
            </section>
          );
        })}
      </section>

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
                      fail("needs", null);
                      const r = await upcomingStatus(n.id, e.target.value as "open" | "styled" | "done");
                      if (!r.ok) fail("needs", r.error);
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
          {errors.needs && <Notice tone="error">{errors.needs}</Notice>}
        </section>
      )}
    </div>
  );
}
