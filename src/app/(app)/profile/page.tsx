import { Button, ButtonLink, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import {
  AccountCard,
  BrandsCard,
  ProfileEditing,
  ColorCard,
  MeasurementsCard,
  StyleCard,
  type BrandRow,
} from "./ProfileEditor";
import ProfilePhotos from "./ProfilePhotos";
import AppCard from "@/components/pwa/AppCard";

const strs = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
const fabrics = (xs: unknown): Array<{ name: string; strength: "soft" | "hard" }> =>
  Array.isArray(xs)
    ? xs
        .filter((x): x is { name: string; strength?: string } => !!x && typeof (x as { name?: unknown }).name === "string")
        .map((x) => ({ name: x.name, strength: x.strength === "hard" ? ("hard" as const) : ("soft" as const) }))
    : [];
const n = (v: unknown): number | null => (typeof v === "number" ? v : v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: profile }, { data: color }, { data: m }, { data: style }, { data: brands }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("color_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("measurements").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("style_prefs").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("brands").select("id, name, status, note").eq("user_id", uid).order("created_at", { ascending: true }),
    supabase.from("profile_photos").select("slot, image_path").eq("user_id", uid),
  ]);

  const signed = await signedImageUrls(
    supabase,
    (photos ?? []).map((p) => p.image_path as string)
  );
  const photoUrls: Record<string, string> = {};
  for (const p of photos ?? []) {
    const u = signed[p.image_path as string];
    if (u) photoUrls[p.slot as string] = u;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        actions={
          <ButtonLink href="/profile/palette" variant="secondary" size="sm">
            Palette card
          </ButtonLink>
        }
      />

      <ProfileEditing>
      <ColorCard
        data={{
          season_label: (color?.season_label as string | null) ?? "",
          undertone: (color?.undertone as string | null) ?? "",
          depth: (color?.depth as string | null) ?? "",
          contrast: (color?.contrast as string | null) ?? "",
          best_colors: strs(color?.best_colors),
          avoid_colors: strs(color?.avoid_colors),
          notes: (color?.notes as string | null) ?? "",
        }}
      />

      <StyleCard
        data={{
          aesthetic_statement: (style?.aesthetic_statement as string | null) ?? "",
          loves: strs(style?.loves),
          dislikes: strs(style?.dislikes),
          silhouettes_preferred: strs(style?.silhouettes_preferred),
          silhouettes_avoid: strs(style?.silhouettes_avoid),
          fabrics_preferred: fabrics(style?.fabrics_preferred),
          fabrics_avoid: fabrics(style?.fabrics_avoid),
        }}
      />

      <MeasurementsCard
        data={{
          height_in: n(m?.height_in),
          inseam_in: n(m?.inseam_in),
          shoulders_in: n(m?.shoulders_in),
          chest_bust_in: n(m?.chest_bust_in),
          waist_in: n(m?.waist_in),
          hips_in: n(m?.hips_in),
          neck_in: n(m?.neck_in),
          sleeve_in: n(m?.sleeve_in),
          rise_target_in: (m?.rise_target_in as string | null) ?? "",
          sizing_notes: (m?.sizing_notes as string | null) ?? "",
        }}
      />

      <BrandsCard brands={(brands ?? []) as BrandRow[]} />

      <ProfilePhotos urls={photoUrls} />

      <AccountCard
        data={{
          name: (profile?.name as string | null) ?? "",
          email: (profile?.email as string) ?? "",
          location: (profile?.location as string | null) ?? "",
          presentation: (profile?.presentation as "womens" | "mens" | "both") ?? "both",
        }}
      />

      <AppCard />
      </ProfileEditing>

      <form action="/auth/signout" method="post" className="sm:hidden">
        <Button type="submit" variant="secondary" block>
          Sign out
        </Button>
      </form>
    </div>
  );
}
