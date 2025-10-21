const metrics = [
  { label: "Monthly revenue", value: "$128,400", delta: "+12.4%" },
  { label: "Active customers", value: "1,248", delta: "+3.7%" },
  { label: "Avg. response time", value: "2m 12s", delta: "-22%" },
  { label: "Renewal rate", value: "94.6%", delta: "+1.1%" },
];

const activities = [
  {
    title: "Enterprise onboarding",
    body: "Delta Industrial completed phase two of the rollout plan.",
    timestamp: "2 hours ago",
  },
  {
    title: "Revenue alert",
    body: "Net new ARR exceeded the weekly forecast by 8.5%.",
    timestamp: "6 hours ago",
  },
  {
    title: "Support pulse",
    body: "CSAT climbed to 4.6 following the new escalation policy.",
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
          Monitor performance across revenue, customers, and service quality in
          real time.
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
              Pipeline coverage
            </h2>
            <p className="text-xs text-muted-foreground">
              Week-over-week allocation across your active opportunities.
            </p>
          </div>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            Chart visualizations coming soon.
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none">
              Latest activity
            </h2>
            <p className="text-xs text-muted-foreground">
              A rolling feed of the most important workspace updates.
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
