export function SettingsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure retention rules, minting safeguards, and access control for
          the finish tracking workspace.
        </p>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">
          Upcoming configuration panels
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mirror Supabase triggers and policies exposed in `llm/docs/database.md`.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Mint guardrails — enforce max mints per player and lock banned
            accounts.
          </li>
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Ownership event validation — surface outcomes from
            `validate_transfer_against_items`.
          </li>
          <li className="rounded-md border border-dashed border-border px-4 py-3">
            Catalog lifecycle — control auto updates for `set_updated_at`
            triggers.
          </li>
        </ul>
      </div>
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Placeholder for access roles, API keys, and integration toggles.
      </div>
    </section>
  );
}

export default SettingsPage;
