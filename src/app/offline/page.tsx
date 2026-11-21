import Wordmark from "@/components/Wordmark";

export const metadata = { title: "Offline · valette" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center text-stone-900">
      <Wordmark size={28} />
      <h1 className="font-display text-3xl font-extrabold">you&apos;re offline.</h1>
      <p className="max-w-sm text-stone-600">Pages you opened recently still work: try Today, Plan or your Closet. Anything new needs a connection.</p>
      {/* Plain links on purpose: a full page load lets the service worker serve the saved copy offline. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <div className="flex gap-2 text-sm font-semibold">
        <a href="/today" className="rounded-full bg-emerald-700 px-4 py-2 text-white">Today</a>
        <a href="/plan" className="rounded-full border-[1.5px] border-stone-900 px-4 py-2">Plan</a>
        <a href="/closet" className="rounded-full border-[1.5px] border-stone-900 px-4 py-2">Closet</a>
      </div>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </div>
  );
}
