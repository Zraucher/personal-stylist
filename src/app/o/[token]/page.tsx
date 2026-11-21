import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { loadPublicOpinion } from "@/lib/opinions/public";
import { firstName } from "@/lib/opinions/tally";
import VoteForm from "./VoteForm";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const o = await loadPublicOpinion(token, { images: false });
  if (!o) return { title: "valette", robots: { index: false } };
  const title = `Does this work on ${o.owner}?`;
  return {
    title,
    description: o.question ?? `${o.owner} wants a second opinion on ${o.snapshot.title}. Vote in one tap.`,
    robots: { index: false, follow: false },
    openGraph: { title, description: o.question ?? "Vote in one tap. No account needed.", siteName: "valette", type: "website" },
  };
}

const price = (n: number | null | undefined, cur: string | null | undefined) => (n == null ? null : `${cur && cur !== "USD" ? `${cur} ` : "$"}${n % 1 ? n.toFixed(2) : n}`);

export default async function OpinionPage({ params }: Props) {
  const { token } = await params;
  const o = await loadPublicOpinion(token);
  if (!o) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === o.userId;
  let viewerName: string | null = null;
  if (user && !isOwner) {
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const n = firstName(prof?.name as string | null);
    viewerName = n === "your friend" ? null : n;
  }
  const s = o.snapshot;

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="valette home">
          <Wordmark size={22} />
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">second opinion</span>
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-5 pb-16">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-extrabold leading-[0.95]">does this work on {o.owner.toLowerCase() === "your friend" ? "them" : o.owner}?</h1>
          {o.question && <p className="text-lg text-stone-700">“{o.question}”</p>}
        </div>

        {isOwner && (
          <p className="rounded-xl bg-amber-100 p-3 text-sm">
            This is the page your friends see. <Link href={`/opinions/${o.id}`} className="font-semibold underline">See your votes</Link>
          </p>
        )}

        <section className="space-y-3 rounded-2xl bg-white p-4">
          <p className="font-display text-xl font-bold">{s.title}</p>
          {o.kind === "outfit" ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(s.items ?? []).map((it, i) => (
                <li key={i} className="space-y-1">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                    {o.images[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.images[i]!} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center">
                        <span className="flex gap-1">
                          {it.colors.slice(0, 3).map((c, k) => (
                            <span key={k} className="h-6 w-6 rounded-full border border-stone-300" style={{ background: c.hex ?? "#d6d3d1" }} />
                          ))}
                        </span>
                        <span className="text-xs text-stone-500">{it.subcategory ?? "piece"}</span>
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm">{it.name}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-4">
              {s.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt={s.title} className="h-40 w-32 shrink-0 rounded-xl bg-stone-100 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="space-y-1 text-sm">
                {s.brand && <p className="font-semibold">{s.brand}</p>}
                {price(s.price, s.currency) && <p className="text-lg font-bold">{price(s.price, s.currency)}</p>}
                {s.store && <p className="text-stone-500">from {s.store}</p>}
              </div>
            </div>
          )}
        </section>

        {!isOwner && <VoteForm token={token} owner={o.owner === "your friend" ? "them" : o.owner} closed={o.closed} initialTally={o.tally} defaultName={viewerName} />}
        {isOwner && <p className="text-center text-sm text-stone-500">{o.tally.summary}</p>}

        <p className="text-center text-xs text-stone-400">
          Shared from valette, the stylist that checks it on you first. <Link href="/privacy" className="underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
