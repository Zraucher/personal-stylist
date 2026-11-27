import Link from "next/link";
import { EmptyState, Eyebrow, ListCard, ListRow, SectionTitle } from "@/components/ui";

export type WaitingItem = { href: string; title: string; meta: string; count: number };
export type ToolLink = { href: string; title: string; meta: string };
export type ToolGroup = { label: string; links: ToolLink[] };

/** Things that only move when the person acts: each row is the action, the count says how many. */
export function WaitingOnYou({ items }: { items: WaitingItem[] }) {
  return (
    <section id="waiting" aria-labelledby="waiting-title" className="scroll-mt-20 space-y-3">
      <h2 id="waiting-title" className="font-display text-xl font-bold leading-tight">
        Waiting on you
      </h2>
      {items.length ? (
        <ListCard>
          {items.map((it) => (
            <ListRow
              key={it.href}
              href={it.href}
              title={it.title}
              meta={it.meta}
              leading={
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blush font-display text-[15px] font-extrabold tabular-nums text-ink" aria-hidden="true">
                  {it.count > 99 ? "99+" : it.count}
                </span>
              }
            />
          ))}
        </ListCard>
      ) : (
        <EmptyState
          compact
          title="nothing waiting"
          body={
            <>
              Nothing&rsquo;s waiting on you right now.{" "}
              <Link href="/save" className="font-medium text-stone-900 underline underline-offset-2">
                Save a product you&rsquo;re eyeing
              </Link>{" "}
              and we&rsquo;ll watch its price.
            </>
          }
        />
      )}
    </section>
  );
}

/** Every tool, grouped the way the tabs are, each row with what it holds right now. */
export function Tools({ groups }: { groups: ToolGroup[] }) {
  return (
    <section aria-labelledby="tools-title" className="space-y-3">
      <SectionTitle>
        <span id="tools-title">Everything in Valette</span>
      </SectionTitle>
      <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
        {groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <Eyebrow>{g.label}</Eyebrow>
            <ListCard>
              {g.links.map((l) => (
                <ListRow key={l.href} href={l.href} title={l.title} meta={l.meta} />
              ))}
            </ListCard>
          </div>
        ))}
      </div>
    </section>
  );
}
