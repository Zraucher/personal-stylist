import { createClient } from "@/lib/supabase/server";
import SourcedList, { type SourcedItem } from "./SourcedList";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default async function SourcedPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("closet_items")
    .select("id, name, brand, colors, source_image_url, source_page_url")
    .is("image_path", null)
    .not("source_image_url", "is", null)
    .neq("status", "gone")
    .order("category")
    .order("name");

  const items: SourcedItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string | null,
    brand: r.brand as string | null,
    colors: ((r.colors ?? []) as Array<{ name?: string }>).map((c) => c.name).filter(Boolean).join(", "),
    source_image_url: r.source_image_url as string,
    source_page_url: r.source_page_url as string | null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sourced photos"
        back={{ href: "/closet", label: "Closet" }}
        subtitle="Product photos found online for pieces without a photo. Check the color and style match what you own. A photo you accept is copied into your private closet."
      />
      {items.length === 0 ? (
        <EmptyState
          title="nothing waiting for review"
          action={
            <ButtonLink href="/closet" variant="secondary">
              Back to closet
            </ButtonLink>
          }
        />
      ) : (
        <SourcedList items={items} />
      )}
    </div>
  );
}
