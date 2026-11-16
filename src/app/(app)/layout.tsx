import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomTabs, TopNav } from "./NavTabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const who = profile?.name ?? profile?.email ?? user.email ?? "";

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap text-sm">
            <span className="font-semibold tracking-tight">Valette</span>
            <TopNav />
          </nav>
          <form action="/auth/signout" method="post" className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-500 sm:inline">{who}</span>
            <button type="submit" className="text-stone-600 hover:text-stone-900">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pb-6">{children}</main>
      <BottomTabs />
    </div>
  );
}
