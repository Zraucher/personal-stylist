"use client";

import { useState } from "react";
import type { RecommendationView } from "@/lib/today/recommend";
import RecommendationCards from "../today/RecommendationCards";

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
        className="space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Describe the day: where, when, the weather, anything you won't wear"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-stone-900"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 hover:border-stone-500">
              {ex}
            </button>
          ))}
        </div>
        <button type="submit" disabled={loading || text.trim().length < 3} className="rounded-full bg-emerald-700 px-5 py-2 font-bold text-white disabled:opacity-60">
          {loading ? "Thinking…" : "Ask"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
      {rec && (
        <div className="space-y-2">
          {rec.prompt && <p className="text-sm text-stone-500">For: “{rec.prompt}”</p>}
          <RecommendationCards key={rec.id} rec={rec} />
        </div>
      )}
    </div>
  );
}
