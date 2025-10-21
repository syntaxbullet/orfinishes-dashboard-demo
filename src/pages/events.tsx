const eventSummary = [
  { label: "Transfers today", value: "24", context: "4 flagged for review" },
  { label: "Unboxes this week", value: "61", context: "Minted by 18 players" },
  { label: "Revocations YTD", value: "3", context: "All post-audit" },
];

const recentEvents = [
  {
    id: "evt-71c1",
    type: "transfer",
    itemId: "4f62-aurora",
    fromPlayer: "emberline",
    toPlayer: "glimmer-falls",
    occurredAt: "2025-10-14T18:03Z",
  },
  {
    id: "evt-71bd",
    type: "unbox",
    itemId: "12ab-irid",
    fromPlayer: null,
    toPlayer: "craft-core",
    occurredAt: "2025-10-14T17:11Z",
  },
  {
    id: "evt-71b4",
    type: "grant",
    itemId: "9c77-obs",
    fromPlayer: null,
    toPlayer: "emberline",
    occurredAt: "2025-10-13T23:44Z",
  },
];

export function EventsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Ownership Events
        </h1>
        <p className="text-sm text-muted-foreground">
          Review the event ledger for grants, transfers, unboxes, and revokes
          sourced from `public.ownership_events`.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {eventSummary.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.context}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">Latest events</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Placeholder feed mirroring the Supabase event indices.
        </p>
        <div className="mt-4 space-y-3">
          {recentEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-md border border-border bg-background px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2 text-xs uppercase text-muted-foreground">
                <span>{event.type}</span>
                <time>{event.occurredAt}</time>
              </div>
              <p className="mt-2 font-medium text-foreground">
                Item {event.itemId}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.fromPlayer
                  ? `from ${event.fromPlayer} → ${event.toPlayer}`
                  : `to ${event.toPlayer}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Event diff tooling and policy audit logs will surface here after RPCs
        are connected.
      </div>
    </section>
  );
}

export default EventsPage;
