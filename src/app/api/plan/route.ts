import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dayCandidates, fillWeek, loadWeekState, OCCASION_IDS, removePlanOutfit, savePlanDay, weekView } from "@/lib/plan/server";
import { planSequence } from "@/lib/plan/sequence";
import { recordWear } from "@/lib/wear";

export const maxDuration = 60;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view") }),
  z.object({ action: z.literal("fill"), replan: z.boolean().optional() }),
  z.object({ action: z.literal("swap"), date }),
  z.object({ action: z.literal("occasion"), date, occasion: z.enum(OCCASION_IDS) }),
  z.object({ action: z.literal("clear"), date }),
  z.object({ action: z.literal("wore"), date }),
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;

  try {
    const s = await loadWeekState(supabase, user.id);
    let message: string | null = null;
    if (b.action !== "view" && b.action !== "fill" && !s.dates.includes(b.date)) return NextResponse.json({ error: "That day is outside this week. Reload Plan and try again." }, { status: 400 });

    if (b.action === "fill") {
      const n = await fillWeek(supabase, user.id, s, { replan: b.replan });
      if (!n) message = s.closet.length < 6 ? "Plans need a few tops, bottoms and shoes. Add a few more pieces and we'll fill your week." : "Nothing new to plan. Tap Try another on a day for a different look.";
    } else if (b.action === "swap" || b.action === "occasion") {
      const i = s.dates.indexOf(b.date);
      const plan = s.plans.get(b.date);
      if (plan?.worn) return NextResponse.json({ error: "You already wore this one." }, { status: 400 });
      const current = plan?.outfit_id ? s.outfits.get(plan.outfit_id)?.item_ids ?? [] : [];
      const occasion = b.action === "occasion" ? b.occasion : ((plan?.occasion as (typeof OCCASION_IDS)[number] | undefined) ?? "casual");
      if (b.action === "occasion") s.plans.set(b.date, { id: plan?.id ?? "", occasion, outfit_id: plan?.outfit_id ?? null, worn: false });
      const cands = dayCandidates(s.closet, s.weather[i], occasion, s.ctx, b.action === "swap" ? current : []);
      const fixed = s.dates.map((d, k) => (k === i ? null : (() => {
        const p = s.plans.get(d);
        return p?.outfit_id ? s.outfits.get(p.outfit_id)?.item_ids ?? [] : [];
      })()));
      const days = s.dates.map((_, k) => (k === i ? cands : []));
      const pick = planSequence(days, { fixed })[i];
      if (pick < 0 && b.action === "swap") message = "That's the only outfit your closet makes for this day.";
      else await savePlanDay(supabase, user.id, s, b.date, occasion, pick >= 0 ? cands[pick] : null);
      if (pick < 0 && b.action === "occasion") message = "Nothing in your closet fits that occasion and weather yet.";
    } else if (b.action === "clear") {
      const plan = s.plans.get(b.date);
      if (plan) {
        await supabase.from("plans").delete().eq("id", plan.id).eq("user_id", user.id);
        if (plan.outfit_id) await removePlanOutfit(supabase, user.id, plan.outfit_id);
        s.plans.delete(b.date);
      }
    } else if (b.action === "wore") {
      const plan = s.plans.get(b.date);
      const o = plan?.outfit_id ? s.outfits.get(plan.outfit_id) : undefined;
      if (!plan || !o) return NextResponse.json({ error: "Nothing's planned that day. Plan it first." }, { status: 400 });
      if (plan.worn) return NextResponse.json({ week: await weekView(supabase, s), message: null });
      if (b.date > s.today) return NextResponse.json({ error: "You can tap Wore it on the day itself." }, { status: 400 });
      await recordWear(supabase, user.id, o.item_ids, b.date, { outfitId: o.id, affinity: 0.5 });
      await supabase.from("plans").update({ worn: true, updated_at: new Date().toISOString() }).eq("id", plan.id).eq("user_id", user.id);
      s.plans.set(b.date, { ...plan, worn: true });
    }

    return NextResponse.json({ week: await weekView(supabase, s), message });
  } catch (e) {
    console.error("plan action failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
