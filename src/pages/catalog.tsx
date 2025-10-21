const catalogHighlights = [
  {
    label: "Total cosmetics",
    value: "312",
    detail: "Tracked across 9 collections",
  },
  {
    label: "Finish variants",
    value: "17",
    detail: "Includes seasonal exclusives",
  },
  {
    label: "Needs source review",
    value: "5",
    detail: "Missing supplier metadata",
  },
];

const upcomingTasks = [
  "Backfill exclusive_to_year for legacy drops (<= 2019).",
  "Tag cosmetics missing rarity notes before the next sync.",
  "Confirm trigger coverage for set_updated_at after manual edits.",
];

export function CatalogPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Cosmetics Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Reference the authoritative list of cosmetics, their finish
          eligibility, and acquisition sources.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {catalogHighlights.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">
          Catalog maintenance checklist
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on `public.cosmetics` schema from the Supabase database.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {upcomingTasks.map((task) => (
            <li
              key={task}
              className="rounded-md border border-dashed border-border px-4 py-3"
            >
              {task}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Placeholder for cosmetic-level table views and filters once wired to
        Supabase.
      </div>
    </section>
  );
}

export default CatalogPage;
