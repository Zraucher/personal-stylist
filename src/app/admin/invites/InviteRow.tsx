"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { inviteFromWaitlist, type InviteState } from "./actions";

export function InviteRow({ email, label, invited }: { email: string; label: string; invited: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteFromWaitlist, { ok: false });
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="email" value={email} />
      <div className="flex w-full items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm">{label}</span>
        <Button type="submit" size="sm" variant={invited ? "secondary" : "primary"} disabled={pending}>
          {pending ? "Sending" : invited ? "Resend" : "Invite"}
        </Button>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
