import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: color }, { data: measurements }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase.from("color_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("measurements").select("*").eq("user_id", user!.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">Account</h2>
        <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          <dt className="text-stone-500">Name</dt>
          <dd>{profile?.name ?? <Empty />}</dd>
          <dt className="text-stone-500">Email</dt>
          <dd>{profile?.email}</dd>
          <dt className="text-stone-500">Location</dt>
          <dd>{profile?.location ?? <Empty />}</dd>
          <dt className="text-stone-500">Outfits for</dt>
          <dd>{profile?.presentation}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">Color</h2>
        {color ? (
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-stone-500">Season</dt>
            <dd>{color.season_label}</dd>
            <dt className="text-stone-500">Best colors</dt>
            <dd>{(color.best_colors as string[]).join(", ")}</dd>
            <dt className="text-stone-500">Avoid</dt>
            <dd>{(color.avoid_colors as string[]).join(", ")}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            Not set. The seed loader in session 2 fills this in.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">Measurements</h2>
        {measurements ? (
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-stone-500">Height</dt>
            <dd>{measurements.height_in} in</dd>
            <dt className="text-stone-500">Inseam</dt>
            <dd>{measurements.inseam_in} in</dd>
            <dt className="text-stone-500">Sizing notes</dt>
            <dd>{measurements.sizing_notes ?? <Empty />}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Not set.</p>
        )}
      </section>
    </div>
  );
}

function Empty() {
  return <span className="text-stone-400">—</span>;
}
