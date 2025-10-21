const playerStats = [
  { label: "Registered players", value: "812", context: "Matching `public.players`" },
  { label: "Mint-qualified", value: "648", context: "Not banned, verified" },
  { label: "Banned accounts", value: "12", context: "Blocked from transfers" },
];

const samplePlayers = [
  {
    id: "583b6ebd-9850-42b3-bd43-25f9e5914b5a",
    handle: "glimmer-falls",
    minted: 18,
    owned: 42,
    status: "Active",
  },
  {
    id: "04f121dc-0070-423c-94c5-479db0fd40e7",
    handle: "craft-core",
    minted: 9,
    owned: 27,
    status: "Active",
  },
  {
    id: "160d1723-adf2-4a2f-82c5-8c14168e3adc",
    handle: "emberline",
    minted: 0,
    owned: 3,
    status: "Banned",
  },
];

export function PlayersPage() {
  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Players
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore player profiles, minting history, and moderation status from
          `public.players`.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {playerStats.map((stat) => (
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
        <h2 className="text-lg font-semibold leading-none">
          Player overview (placeholder)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Surface high-value players by mint count, ownership volume, and ban
          status.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Player ID</th>
                <th className="py-2 pr-4">Handle</th>
                <th className="py-2 pr-4">Items minted</th>
                <th className="py-2 pr-4">Items owned</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {samplePlayers.map((player) => (
                <tr key={player.id}>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                    {player.id}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{player.handle}</td>
                  <td className="py-3 pr-4 text-foreground">
                    {player.minted}
                  </td>
                  <td className="py-3 pr-4 text-foreground">
                    {player.owned}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {player.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Player profile drill-downs and Supabase function outputs will appear
        here soon.
      </div>
    </section>
  );
}

export default PlayersPage;
