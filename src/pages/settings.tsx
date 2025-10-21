export function SettingsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure workspace preferences, billing details, and access control.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Settings panels will arrive soon. Use this space to outline upcoming
        configuration flows.
      </div>
    </section>
  );
}

export default SettingsPage;
