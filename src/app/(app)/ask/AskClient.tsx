"use client";

import { useState } from "react";
import type { RecommendationView } from "@/lib/today/recommend";
import RecommendationCards from "../today/RecommendationCards";
import { Button, Card, ChipButton, ChipGroup, Field, Notice, Skeleton, Textarea } from "@/components/ui";

const EXAMPLES = [
  "Rooftop dinner Friday, it'll be 95 at sunset, no dress",
  "Client meeting tomorrow morning, cold office",
  "Golf Saturday morning",
  "Flight to Denver on Sunday, comfortable but not sloppy",
];

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
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: query }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.recommendation) throw new Error(body.detail || "Could not answer that.");
      setRec(body.recommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not answer that.");
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
        <ChipGroup label="Examples">
          {EXAMPLES.map((ex) => (
            <ChipButton key={ex} selected={text === ex} onClick={() => setText(ex)} className="h-auto py-1.5 text-left text-[13px] leading-snug">
              {ex}
            </ChipButton>
          ))}
        </ChipGroup>
        <Button type="submit" variant="primary" disabled={loading || text.trim().length < 3} aria-busy={loading}>
          {loading ? "Thinking…" : "Ask"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>
      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Thinking…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : (
        rec && (
          <div className="space-y-2">
            {rec.prompt && <p className="text-sm text-stone-500">For: “{rec.prompt}”</p>}
            <RecommendationCards key={rec.id} rec={rec} />
          </div>
        )
      )}
    </div>
  );
}
