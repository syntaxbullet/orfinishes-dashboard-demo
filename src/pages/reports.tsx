export function ReportsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate exports for catalog diffs, ownership audits, and retention
          reviews.
        </p>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">Scheduled jobs</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use Supabase functions like `fetch_item_overview` to populate these
          extracts.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Nightly ownership snapshot → Exports latest holder per item with
            first unbox metadata.
          </li>
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Weekly catalog change report → Highlights cosmetics added/updated in
            the past 7 days.
          </li>
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Player mint leaderboard → Summaries of top minters using
            `fetch_player_profile_data`.
          </li>
        </ul>
      </div>
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        UI for configuring export destinations and retention policies will live
        here.
      </div>
    </section>
  );
}

export default ReportsPage;
