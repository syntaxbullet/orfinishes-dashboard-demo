export function ReportsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Access curated exports, audit logs, and compliance-ready summaries.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Your saved and scheduled reports will be listed here shortly.
      </div>
    </section>
  );
}

export default ReportsPage;
