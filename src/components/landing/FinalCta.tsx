import Image from "next/image";
import joinPhoto from "../../../public/landing/join.webp";
import { Cta } from "./Cta";
import { DISPLAY_H2 } from "./Section";

/** Closing headline and form on a Blush band. `#join` is where the nav's "Get an invite" lands. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="join" aria-labelledby="join-title" className="scroll-mt-16 bg-blush">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-24 sm:px-6 sm:py-32 md:grid-cols-[2fr_3fr] md:gap-16">
        <Image
          src={joinPhoto}
          alt="One chosen outfit on a hanger: a green cardigan over a cream blouse against a blush wall."
          sizes="(min-width: 768px) 38vw, 100vw"
          placeholder="blur"
          className="mx-auto aspect-[4/5] w-full max-w-sm rounded-[20px] object-cover"
        />
        <div className="space-y-6 text-center md:text-left">
        <h2 id="join-title" className={DISPLAY_H2 + " sm:text-[64px]"}>
          get dressed sure.
        </h2>
        <p className="text-lg text-stone-700">{signedIn ? "Your closet is ready when you are." : "Join the early access list and we'll send your invite."}</p>
        <div className={signedIn ? "flex justify-center md:justify-start" : "mx-auto max-w-xl text-left md:mx-0"}>
          <Cta signedIn={signedIn} source="footer" />
        </div>
        </div>
      </div>
    </section>
  );
}
