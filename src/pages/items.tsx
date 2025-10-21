const itemStats = [
  { label: "Minted this season", value: "1,238", context: "Season 12" },
  { label: "Transfers in review", value: "42", context: "Awaiting approval" },
  { label: "Banned-owner items", value: "7", context: "Held for audit" },
];

const placeholderItems = [
  {
    id: "4f62-aurora",
    cosmetic: "Nebula Visor",
    finish: "Aurora Alloy",
    owner: "glimmer-falls",
    mintedAt: "2025-10-14",
  },
  {
    id: "12ab-irid",
    cosmetic: "Holo Shard Cape",
    finish: "Iridescent",
    owner: "craft-core",
    mintedAt: "2025-10-12",
  },
  {
    id: "9c77-obs",
    cosmetic: "Sunder Gauntlets",
    finish: "Obsidian Frost",
    owner: "emberline",
    mintedAt: "2025-10-10",
  },
];

export function ItemsPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Minted Items
        </h1>
        <p className="text-sm text-muted-foreground">
          Inspect minted instances, their finishes, and current ownership pulled
          from `public.items`.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {itemStats.map((stat) => (
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
        <h2 className="text-lg font-semibold leading-none">Inventory sample</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Placeholder data until the Supabase connection is wired.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Item ID</th>
                <th className="py-2 pr-4">Cosmetic</th>
                <th className="py-2 pr-4">Finish</th>
                <th className="py-2 pr-4">Owner</th>
                <th className="py-2 pr-4">Minted at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {placeholderItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                    {item.id}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{item.cosmetic}</td>
                  <td className="py-3 pr-4 text-foreground">{item.finish}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {item.owner}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {item.mintedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Item filters, ownership history, and moderation actions will surface
        here once connected to Supabase RPC calls.
      </div>
    </section>
  );
}

export default ItemsPage;
