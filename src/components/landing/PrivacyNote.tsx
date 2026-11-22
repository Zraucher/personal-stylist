import Link from "next/link";
import { DISPLAY_H2, EyebrowPill, Section } from "./Section";

/** What happens to photos. Wording matches the FAQ answer; legal review before launch. */
export function PrivacyNote() {
  return (
    <Section labelledBy="privacy-title">
      <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
        <div className="space-y-5">
          <EyebrowPill>your photos</EyebrowPill>
          <h2 id="privacy-title" className={DISPLAY_H2}>
            your closet stays yours.
          </h2>
        </div>
        <div className="space-y-5">
          <p className="text-pretty text-lg leading-relaxed text-stone-700">
            Your closet and photos are private to your account. We use them to give you advice. You can delete any photo in the app, and we&apos;ll delete your account if you ask.
          </p>
          <Link
            href="/privacy"
            className="tap inline-flex items-center gap-1.5 rounded-full text-[15px] font-semibold text-stone-900 underline decoration-line-strong decoration-2 underline-offset-4 transition-colors duration-200 ease-soft hover:decoration-stone-900"
          >
            Read the privacy policy
          </Link>
        </div>
      </div>
    </Section>
  );
}
