import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomTabs, TopNav } from "./NavTabs";
import Wordmark from "@/components/Wordmark";
import { buttonClass } from "@/components/ui";

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
    <div className="min-h-dvh bg-ground text-stone-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(env(safe-area-inset-top)+0.5rem)] focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-stone-900 focus:px-5 focus:text-[15px] focus:font-semibold focus:text-stone-50 focus:shadow-sheet"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 bg-ground/80 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/today" aria-label="valette home" className="tap shrink-0 rounded-full">
              <Wordmark size={22} />
            </Link>
            <nav aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap text-sm sm:flex">
              <TopNav />
            </nav>
          </div>
          <form action="/auth/signout" method="post" className="hidden items-center gap-2 text-sm sm:flex">
            <span className="max-w-[16ch] truncate text-stone-500">{who}</span>
            <button type="submit" className={buttonClass("quiet", "sm")}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:pb-12 sm:pt-10">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
