import { Cta } from "./Cta";
import { DISPLAY_H2 } from "./Section";

/** Closing headline and form on a Blush band. `#join` is where the nav's "Get an invite" lands. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="join" aria-labelledby="join-title" className="scroll-mt-16 bg-blush">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-24 text-center sm:px-6 sm:py-32">
        <h2 id="join-title" className={DISPLAY_H2 + " sm:text-[64px]"}>
          get dressed sure.
        </h2>
        <p className="text-lg text-stone-700">{signedIn ? "Your closet is ready when you are." : "Join the early access list and we'll send your invite."}</p>
        <div className={signedIn ? "flex justify-center" : "mx-auto max-w-xl text-left"}>
          <Cta signedIn={signedIn} source="footer" />
        </div>
      </div>
    </section>
  );
}
