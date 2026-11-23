import { PageHeader } from "@/components/ui";
import { cleanLink } from "@/lib/retail/link";
import SaveClient from "./SaveClient";

export const metadata = { title: "Save a product · valette" };

// Lands here from the wishlist's paste box, the phone's share sheet and the browser button.
export default async function SavePage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string; title?: string }> }) {
  const { url, text, title } = await searchParams;
  const shared = [url, text, title].some((v) => v?.trim());
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/wishlist", label: "Wishlist" }} title="Save a product" subtitle="Save it from any store now. Decide later." />
      <SaveClient link={cleanLink(url, text, title)} noLink={shared} />
    </div>
  );
}
