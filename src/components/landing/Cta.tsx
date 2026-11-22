import { ButtonLink } from "@/components/ui";
import WaitlistForm from "./WaitlistForm";

/** The page's call to action: the waitlist form, or "Open the app" for people already signed in. */
export function Cta({ signedIn, source }: { signedIn: boolean; source: "hero" | "pricing" | "footer" }) {
  if (signedIn) {
    return (
      <ButtonLink href="/today" variant="primary">
        Open the app
      </ButtonLink>
    );
  }
  return <WaitlistForm source={source} />;
}
