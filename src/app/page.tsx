import { redirect } from "next/navigation";

export default function Home() {
  // The proxy sends signed-out visitors to /login before this runs.
  redirect("/today");
}
