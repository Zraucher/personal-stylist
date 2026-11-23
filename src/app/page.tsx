import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ProofStrip } from "@/components/landing/ProofStrip";
import { ProblemPromise } from "@/components/landing/ProblemPromise";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Verdicts } from "@/components/landing/Verdicts";
import { StatBand } from "@/components/landing/StatBand";
import { PrivacyNote } from "@/components/landing/PrivacyNote";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

// Public marketing home, shown to everyone. Signed-in visitors get "Open the app" in place of the
// waitlist. Reading the session cookie makes this page render per request; nothing else is dynamic.

export const metadata: Metadata = {
  title: "valette · check it on you before you wear it",
  description: "Valette checks your outfit against your coloring and your closet, tells you in seconds if it works, and shows you what will if it doesn't.",
  openGraph: {
    title: "valette · check it on you before you wear it",
    description: "Your outfit, checked against your coloring and your closet. More outfits from what you own, fewer second guesses.",
    url: "https://www.myvallette.com",
    siteName: "valette",
    type: "website",
  },
};

async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user);
  } catch {
    // No session or auth unreachable: show the public page.
    return false;
  }
}

export default async function Home() {
  const signedIn = await isSignedIn();
  return (
    <div className="landing min-h-dvh bg-ground text-stone-900">
      <LandingNav signedIn={signedIn} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero signedIn={signedIn} />
        <ProofStrip />
        <ProblemPromise />
        <HowItWorks />
        <Features />
        <Verdicts />
        <StatBand />
        <PrivacyNote />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
