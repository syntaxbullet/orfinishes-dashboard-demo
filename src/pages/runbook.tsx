const procedures = [
  {
    title: "Unbox incident response",
    detail:
      "Pause `unbox_item` calls, review queued events, and notify catalog owners.",
  },
  {
    title: "Transfer dispute workflow",
    detail:
      "Validate event order via `ownership_events_item_time_idx` and restore ownership.",
  },
  {
    title: "Catalog hotfix checklist",
    detail:
      "Apply patch to `public.cosmetics`, confirm `set_updated_at` trigger fire, redeploy build.",
  },
];

export function RunbookPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Operations Runbook
        </h1>
        <p className="text-sm text-muted-foreground">
          Document the human procedures needed to keep unboxing, ownership, and
          catalog data healthy.
        </p>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">
          Standard operating procedures
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Aligns with Supabase triggers, functions, and indexes defined in the
          database documentation.
        </p>
        <div className="mt-4 space-y-3">
          {procedures.map((procedure) => (
            <div
              key={procedure.title}
              className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
            >
              <p className="font-medium text-foreground">{procedure.title}</p>
              <p className="text-xs text-muted-foreground">
                {procedure.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Placeholder for embedded runbook tooling, on-call rotations, and status
        pages.
      </div>
    </section>
  );
}

export default RunbookPage;
