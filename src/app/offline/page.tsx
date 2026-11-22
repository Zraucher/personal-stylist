import Wordmark from "@/components/Wordmark";
import { buttonClass } from "@/components/ui";
import RetryButton from "./RetryButton";

export const metadata = { title: "Offline · valette" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ground px-6 text-center text-stone-900">
      <Wordmark size={28} />
      <h1 className="font-display text-3xl font-extrabold">you&apos;re offline.</h1>
      <p className="max-w-sm text-stone-600">Pages you opened recently still work: try Today, Plan or your Closet. Anything new needs a connection.</p>
      <RetryButton />
      {/* Plain links on purpose: a full page load lets the service worker serve the saved copy offline. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <div className="flex flex-wrap justify-center gap-2">
        <a href="/today" className={buttonClass("secondary", "md")}>Today</a>
        <a href="/plan" className={buttonClass("secondary", "md")}>Plan</a>
        <a href="/closet" className={buttonClass("secondary", "md")}>Closet</a>
      </div>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </main>
  );
}
