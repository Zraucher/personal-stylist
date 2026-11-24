"use client";

import { useState } from "react";
import { whereAmI } from "@/lib/here";
import type { RecommendationView } from "@/lib/today/recommend";
import RecommendationCards from "../today/RecommendationCards";
import { Button, Card, EmptyState, Field, ListCard, Notice, OutfitCardSkeleton, Textarea } from "@/components/ui";

const EXAMPLES = [
  "Rooftop dinner Friday, it'll be 95 at sunset, no dress",
  "Client meeting tomorrow morning, cold office",
  "Golf Saturday morning",
  "Flight to Denver on Sunday, comfortable but not sloppy",
];

const FAILED = "Couldn't find looks for that. Add a detail or two and try again.";

export default function AskClient({ initial }: { initial: RecommendationView | null }) {
  const [text, setText] = useState("");
  const [rec, setRec] = useState<RecommendationView | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    const query = q.trim();
    if (query.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const here = await whereAmI();
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: query, here }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.recommendation) throw new Error(typeof body.detail === "string" ? body.detail : FAILED);
      setRec(body.recommendation);
    } catch (e) {
      // A network failure throws a TypeError with a browser message: show our line instead.
      setError(e instanceof Error && !(e instanceof TypeError) ? e.message : FAILED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        as="form"
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          void ask(text);
        }}
        className="space-y-3"
      >
        <Field label="Describe the day" hint="Where, when, the weather, anything you won't wear.">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void ask(text);
              }
            }}
            rows={3}
            maxLength={500}
            placeholder="Rooftop dinner Friday, it'll be 95 at sunset"
          />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-700">Or start from one of these</p>
          <ListCard>
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  onClick={() => setText(ex)}
                  className="-mx-4 flex min-h-11 w-[calc(100%+2rem)] items-center px-4 py-2.5 text-left text-sm leading-snug text-stone-700 transition-colors duration-200 ease-soft hover:bg-inset/60 hover:text-stone-900 active:bg-inset"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              </li>
            ))}
          </ListCard>
        </div>
        <Button type="submit" variant="primary" disabled={loading || text.trim().length < 3} aria-busy={loading}>
          {loading ? "Thinking…" : "Ask"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>
      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Thinking…</span>
          {[0, 1, 2].map((i) => (
            <OutfitCardSkeleton key={i} />
          ))}
        </div>
      ) : rec ? (
        <div className="space-y-2">
          {rec.prompt && <p className="text-sm text-stone-500">For &ldquo;{rec.prompt}&rdquo;</p>}
          <RecommendationCards key={rec.id} rec={rec} />
        </div>
      ) : (
        <EmptyState
          title="no answer yet"
          body={<>Try something like &ldquo;Client meeting tomorrow morning, cold office&rdquo; and we&rsquo;ll pick three looks from your closet.</>}
        />
      )}
    </div>
  );
}
