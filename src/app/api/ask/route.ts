import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AiError, MODELS, aiAvailable, structured } from "@/lib/ai/claude";
import { HereSchema, loadCloset, loadRecommendation, recommend } from "@/lib/today/recommend";
import type { Occasion } from "@/lib/today/candidates";

export const maxDuration = 60;

const OCC = ["office", "casual", "dinner", "event", "active", "travel"] as const;

const ParseSchema = z.object({
  dayOffset: z.number().int().min(0).max(14).describe("0 today, 1 tomorrow, 4 for 'Friday' if today is Monday, and so on."),
  hours: z.array(z.enum(["morning", "midday", "evening"])).describe("When they will be outside. 'At sunset' or 'dinner' means evening."),
  tempF: z.number().nullable().describe("A temperature they stated, in °F. null if they did not say one."),
  occasion: z.enum(OCC),
  formalityMin: z.number().int().min(1).max(5).nullable().describe("Lowest dress level if the request implies one (1 lounge, 3 smart casual, 5 formal), else null."),
  formalityMax: z.number().int().min(1).max(5).nullable(),
  indoorCold: z.boolean().describe("True if they mention air conditioning, a cold office or a casino."),
  exclude: z.array(z.string()).describe("Garment words they ruled out, singular and lowercase: 'dress', 'shorts', 'jeans'."),
  mustInclude: z.array(z.string()).describe("Specific pieces they want to wear, as they named them."),
});

const Body = z.object({ text: z.string().trim().min(3).max(500), here: HereSchema });

/** Without Claude: a rough reading of the request so Ask still works. */
function heuristic(text: string, todayIdx: number) {
  const t = text.toLowerCase();
  const temp = t.match(/(\d{2,3})\s*(?:°|degrees|f\b)/);
  const occasion: Occasion = /office|work|meeting/.test(t) ? "office" : /dinner|date|rooftop|restaurant/.test(t) ? "dinner" : /wedding|gala|event|party/.test(t) ? "event" : /golf|gym|hike/.test(t) ? "active" : /flight|travel|airport/.test(t) ? "travel" : "casual";
  const exclude = [...t.matchAll(/no (\w+)/g)].map((m) => m[1]);
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const named = days.findIndex((d) => t.includes(d));
  const dayOffset = /tomorrow/.test(t) ? 1 : named >= 0 ? (named - todayIdx + 7) % 7 : 0;
  const hours = /sunset|evening|night|dinner/.test(t) ? (["evening"] as const) : /morning/.test(t) ? (["morning"] as const) : (["morning", "midday", "evening"] as const);
  return { dayOffset, hours: [...hours], tempF: temp ? Number(temp[1]) : null, occasion, formalityMin: null as number | null, formalityMax: null as number | null, indoorCold: /casino|a\/c|air condition|cold office/.test(t), exclude, mustInclude: [] as string[] };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: "Describe the day in a few words." }, { status: 400 });
  const text = parsed.data.text;

  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const tz = (prof?.timezone as string | null) ?? "America/Los_Angeles";
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz }).format(new Date());
  const todayIdx = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(weekday);
  let read: z.infer<typeof ParseSchema> = heuristic(text, todayIdx);
  if (aiAvailable()) {
    try {
      read = await structured({
        schema: ParseSchema,
        model: MODELS.fast,
        maxTokens: 800,
        system: "You turn a short request about what to wear into structured constraints for an outfit picker. Only extract what the person said or clearly implied.",
        text: `Today is ${weekday}. Request: "${text}"`,
      });
    } catch (e) {
      if (!(e instanceof AiError)) throw e;
    }
  }

  // Match named pieces to the closet by words in their names.
  let mustInclude: string[] = [];
  if (read.mustInclude.length) {
    const closet = await loadCloset(supabase, user.id);
    mustInclude = read.mustInclude
      .map((want) => {
        const words = want.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const best = closet
          .map((p) => ({ p, hits: words.filter((w) => `${p.name ?? ""} ${p.subcategory ?? ""}`.toLowerCase().includes(w)).length }))
          .sort((a, b) => b.hits - a.hits)[0];
        return best && best.hits > 0 ? best.p.id : null;
      })
      .filter((id): id is string => !!id);
  }

  const band: [number, number] | undefined =
    read.formalityMin != null || read.formalityMax != null
      ? [read.formalityMin ?? 1, Math.max(read.formalityMax ?? 5, read.formalityMin ?? 1)]
      : undefined;

  try {
    const id = await recommend(supabase, user.id, {
      kind: "ask",
      occasion: read.occasion,
      hours: read.hours,
      indoorCold: read.indoorCold,
      dayOffset: Math.min(read.dayOffset, 6),
      tempOverride: read.tempF ?? (read.dayOffset > 6 ? 75 : null),
      band,
      exclude: read.exclude,
      mustInclude,
      here: parsed.data.here,
      prompt: text,
      extraContext: read.dayOffset > 6 ? "This is more than a week away, so there is no forecast." : null,
    });
    return NextResponse.json({ recommendation: await loadRecommendation(supabase, user.id, id) });
  } catch (e) {
    console.error("ask: recommend failed", e);
    return NextResponse.json({ error: "failed", detail: "Couldn't find looks for that. Add a detail or two and try again." }, { status: 500 });
  }
}
