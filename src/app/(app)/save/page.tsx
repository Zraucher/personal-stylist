import { PageHeader } from "@/components/ui";
import { cleanLink } from "@/lib/retail/link";
import LinkImport from "../closet/new/LinkImport";
import SaveClient from "./SaveClient";

export const metadata = { title: "Save a product · valette" };

// Lands here from the wishlist's paste box, the phone's share sheet and the browser button.
export default async function SavePage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string; title?: string; to?: string }> }) {
  const { url, text, title, to } = await searchParams;
  const shared = [url, text, title].some((v) => v?.trim());
  if (to === "closet")
    return (
      <div className="space-y-6">
        <PageHeader back={{ href: "/closet", label: "Closet" }} title="Add to your closet" subtitle="Something you bought online, straight from its store link." />
        <LinkImport link={cleanLink(url, text, title)} />
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/wishlist", label: "Wishlist" }} title="Save a product" subtitle="Save it from any store now. Decide later." />
      <SaveClient link={cleanLink(url, text, title)} noLink={shared} />
    </div>
  );
}
