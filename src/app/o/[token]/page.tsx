import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { createClient } from "@/lib/supabase/server";
import { loadPublicOpinion } from "@/lib/opinions/public";
import { firstName } from "@/lib/opinions/tally";
import VoteForm from "./VoteForm";
import { Card, Notice, Thumb } from "@/components/ui";

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
    <div className="min-h-dvh bg-ground text-stone-900">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="valette home" className="rounded-full">
          <Wordmark size={22} />
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">second opinion</span>
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-5 pb-16">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-extrabold leading-[0.95]">does this work on {o.owner.toLowerCase() === "your friend" ? "them" : o.owner}?</h1>
          {o.question && <p className="text-lg text-stone-700">“{o.question}”</p>}
        </div>

        {isOwner && (
          <Notice tone="warn">
            This is the page your friends see.{" "}
            <Link href={`/opinions/${o.id}`} className="font-semibold underline underline-offset-2">
              See your votes
            </Link>
          </Notice>
        )}

        <Card as="section" className="space-y-3">
          <h2 className="font-display text-xl font-bold leading-tight">{s.title}</h2>
          {o.kind === "outfit" ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(s.items ?? []).map((it, i) => (
                <li key={i} className="space-y-1.5">
                  <Thumb src={o.images[i]} alt={it.name} item={{ subcategory: it.subcategory, colors: it.colors }} />
                  <p className="truncate text-sm font-medium">{it.name}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-4">
              {s.image_url && (
                <div className="w-32 shrink-0">
                  <Thumb src={s.image_url} alt={s.title} product />
                </div>
              )}
              <div className="space-y-1 text-sm">
                {s.brand && <p className="font-semibold">{s.brand}</p>}
                {price(s.price, s.currency) && <p className="text-lg font-bold">{price(s.price, s.currency)}</p>}
                {s.store && <p className="text-stone-500">from {s.store}</p>}
              </div>
            </div>
          )}
        </Card>

        {!isOwner && <VoteForm token={token} owner={o.owner === "your friend" ? "them" : o.owner} closed={o.closed} initialTally={o.tally} defaultName={viewerName} />}
        {isOwner && <p className="text-center text-sm text-stone-600">{o.tally.summary}</p>}

        <p className="text-center text-xs text-stone-500">
          Shared from valette, the stylist that checks it on you first. <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
