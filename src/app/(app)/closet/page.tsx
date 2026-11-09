import { createClient } from "@/lib/supabase/server";

export default async function ClosetPage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("closet_items")
    .select("id", { count: "exact", head: true })
    .neq("status", "gone");

  const total = count ?? 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Closet</h1>
        <span className="text-sm text-stone-500">
          {total} {total === 1 ? "item" : "items"}
        </span>
      </div>

      {total === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Session 3 adds photo capture and the basics checklist. For now this confirms
            you are signed in and your closet is yours alone.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-stone-600">Item grid arrives in session 3.</p>
      )}
    </div>
  );
}
