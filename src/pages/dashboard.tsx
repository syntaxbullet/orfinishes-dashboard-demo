const metrics = [
  { label: "Catalog cosmetics", value: "312", delta: "+4 added this week" },
  { label: "Minted items", value: "6,842", delta: "+196 past 7 days" },
  { label: "Active players", value: "487", delta: "+23 month-over-month" },
  { label: "Transfers pending QA", value: "18", delta: "12 require review" },
];

const activities = [
  {
    title: "Mint window opened",
    body: "Aurora Alloy finish minted for the 'Nebula Visor' cosmetic.",
    timestamp: "27 minutes ago",
  },
  {
    title: "Transfer flagged",
    body: "Ownership dispute opened on item 4f62 after duplicate transfer.",
    timestamp: "3 hours ago",
  },
  {
    title: "Catalog sync",
    body: "Seasonal cosmetics imported from Supabase metadata snapshot.",
    timestamp: "Yesterday",
  },
];

export function DashboardPage() {
  return (
    <section className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor mint velocity, finish distribution, and ownership health at a
          glance.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-500">
              {metric.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none">
              Finish coverage
            </h2>
            <p className="text-xs text-muted-foreground">
              Compare target vs. actual finish percentages for high-priority
              cosmetics.
            </p>
          </div>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            Finish distribution charts coming soon.
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none">
              Latest activity
            </h2>
            <p className="text-xs text-muted-foreground">
              Rolling log of the most relevant mints, transfers, and catalog
              changes.
            </p>
          </div>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.title} className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.body}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {activity.timestamp}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
