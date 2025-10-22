import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fetchPlayers, type PlayerRecord } from "@/utils/supabase"

const numberFormatter = new Intl.NumberFormat("en-US")
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

type PlayerRow = {
  id: string
  displayName: string
  minecraftUuid: string
  status: "Active" | "Banned"
  isBanned: boolean
  createdAt: string
  createdTimestamp: number
  updatedAt: string
  updatedTimestamp: number
  profileSyncedAt: string | null
  avatarSyncedAt: string | null
  lastSyncedAt: string | null
  lastSyncedTimestamp: number
}

const playerColumns: ColumnDef<PlayerRow>[] = [
  {
    accessorKey: "displayName",
    header: "Player",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium text-foreground">{row.original.displayName}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {row.original.minecraftUuid}
        </p>
      </div>
    ),
    sortingFn: (a, b) =>
      a.original.displayName.localeCompare(b.original.displayName),
    filterFn: (row, _columnId, value) => {
      const search = String(value ?? "").trim().toLowerCase()
      if (!search) {
        return true
      }

      const displayName = row.original.displayName.toLowerCase()
      const uuid = row.original.minecraftUuid.toLowerCase()

      return displayName.includes(search) || uuid.includes(search)
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          row.original.isBanned
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
        )}
      >
        {row.original.status}
      </span>
    ),
    sortingFn: (a, b) =>
      Number(b.original.isBanned) - Number(a.original.isBanned),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      if (Number.isNaN(date.getTime())) {
        return <span className="text-sm text-muted-foreground">—</span>
      }

      return (
        <span className="text-sm text-muted-foreground">
          {dateFormatter.format(date)}
        </span>
      )
    },
    sortingFn: (a, b) =>
      a.original.createdTimestamp - b.original.createdTimestamp,
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated",
    cell: ({ row }) => {
      const date = new Date(row.original.updatedAt)
      if (Number.isNaN(date.getTime())) {
        return <span className="text-sm text-muted-foreground">—</span>
      }

      return (
        <span className="text-sm text-muted-foreground">
          {dateTimeFormatter.format(date)}
        </span>
      )
    },
    sortingFn: (a, b) =>
      a.original.updatedTimestamp - b.original.updatedTimestamp,
  },
  {
    accessorKey: "lastSyncedAt",
    header: "Last synced",
    cell: ({ row }) => {
      const { lastSyncedAt } = row.original
      if (!lastSyncedAt) {
        return <span className="text-sm text-muted-foreground">Never</span>
      }

      const date = new Date(lastSyncedAt)
      if (Number.isNaN(date.getTime())) {
        return <span className="text-sm text-muted-foreground">Never</span>
      }

      return (
        <span className="text-sm text-muted-foreground">
          {dateTimeFormatter.format(date)}
        </span>
      )
    },
    sortingFn: (a, b) =>
      a.original.lastSyncedTimestamp - b.original.lastSyncedTimestamp,
  },
]

export function PlayersPage() {
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showBanned, setShowBanned] = React.useState(false)

  const loadPlayers = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPlayers({ includeBanned: true })
      setPlayers(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load players from Supabase.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  const tableData = React.useMemo<PlayerRow[]>(() => {
    return players.map((player) => {
      const displayName = player.display_name?.trim() || "Unknown handle"
      const createdTimestamp = Date.parse(player.created_at)
      const updatedTimestamp = Date.parse(player.updated_at)
      const profileSyncedAt = player.profile_synced_at
      const avatarSyncedAt = player.avatar_synced_at
      const resolvedSync = profileSyncedAt ?? avatarSyncedAt
      const resolvedSyncTimestamp = resolvedSync
        ? Date.parse(resolvedSync)
        : Number.NaN

      return {
        id: player.id,
        displayName,
        minecraftUuid: player.minecraft_uuid,
        status: player.is_banned ? "Banned" : "Active",
        isBanned: Boolean(player.is_banned),
        createdAt: player.created_at,
        createdTimestamp: Number.isNaN(createdTimestamp)
          ? 0
          : createdTimestamp,
        updatedAt: player.updated_at,
        updatedTimestamp: Number.isNaN(updatedTimestamp)
          ? 0
          : updatedTimestamp,
        profileSyncedAt,
        avatarSyncedAt,
        lastSyncedAt: resolvedSync,
        lastSyncedTimestamp: Number.isNaN(resolvedSyncTimestamp)
          ? -Infinity
          : resolvedSyncTimestamp,
      }
    })
  }, [players])

  const visiblePlayers = React.useMemo(() => {
    if (showBanned) {
      return tableData
    }

    return tableData.filter((player) => !player.isBanned)
  }, [showBanned, tableData])

  const statCards = React.useMemo(() => {
    if (!tableData.length) {
      return [
        {
          label: "Registered players",
          value: "0",
          detail: "No players found in Supabase.",
        },
        {
          label: "Mint eligible",
          value: "0",
          detail: "Awaiting the first verified player.",
        },
        {
          label: "Latest profile sync",
          value: "—",
          detail: "No sync activity recorded yet.",
        },
      ]
    }

    const activePlayers = tableData.filter((player) => !player.isBanned).length
    const bannedPlayers = tableData.length - activePlayers
    const syncedPlayers = tableData.filter(
      (player) => player.lastSyncedAt !== null,
    ).length

    const latestUpdated = tableData.reduce<PlayerRow>(
      (latest, current) =>
        current.updatedTimestamp > latest.updatedTimestamp ? current : latest,
      tableData[0],
    )

    const latestSynced = tableData.reduce<PlayerRow | null>(
      (latest, current) => {
        if (!current.lastSyncedAt) {
          return latest
        }

        if (!latest || current.lastSyncedTimestamp > latest.lastSyncedTimestamp) {
          return current
        }

        return latest
      },
      null,
    )

    const latestSyncedValue =
      latestSynced && latestSynced.lastSyncedAt
        ? (() => {
            const date = new Date(latestSynced.lastSyncedAt)
            return Number.isNaN(date.getTime())
              ? null
              : dateTimeFormatter.format(date)
          })()
        : null
    const latestUpdatedValue = (() => {
      const date = new Date(latestUpdated.updatedAt)
      return Number.isNaN(date.getTime())
        ? null
        : dateTimeFormatter.format(date)
    })()

    return [
      {
        label: "Registered players",
        value: numberFormatter.format(tableData.length),
        detail: `Active ${numberFormatter.format(
          activePlayers,
        )} · Banned ${numberFormatter.format(bannedPlayers)}`,
      },
      {
        label: "Mint eligible",
        value: numberFormatter.format(activePlayers),
        detail: syncedPlayers
          ? `${numberFormatter.format(
              syncedPlayers,
            )} profiles recently synced`
          : "No profile syncs captured",
      },
      {
        label: "Latest profile sync",
        value: latestSyncedValue ?? latestUpdatedValue ?? "—",
        detail: latestSyncedValue
          ? `Last synced: ${latestSynced?.displayName ?? "—"}`
          : latestUpdatedValue
            ? `Last update: ${latestUpdated.displayName}`
            : "No activity recorded",
      },
    ]
  }, [tableData])

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Players
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore player profiles, minting eligibility, and moderation status
          pulled from `public.players`.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            {isLoading ? (
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {card.value}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading ? (
                <span className="inline-block h-3 w-32 animate-pulse rounded bg-muted" />
              ) : (
                card.detail
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-none">Player roster</h2>
          <p className="text-xs text-muted-foreground">
            Grounded readout of `public.players`, including moderation and sync
            state.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm font-medium text-destructive">
                Failed to load player data.
              </p>
              <p className="text-xs text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={loadPlayers}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading players...
            </div>
          ) : (
            <DataTable
              columns={playerColumns}
              data={visiblePlayers}
              filterColumn="displayName"
              filterPlaceholder="Search players..."
              entityLabel="players"
              renderToolbar={(table) => {
                const nameColumn = table.getColumn("displayName")
                const searchValue =
                  (nameColumn?.getFilterValue() as string | undefined) ?? ""
                const isFiltered =
                  Boolean(searchValue.trim()) || showBanned

                return (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        value={searchValue}
                        onChange={(event) =>
                          nameColumn?.setFilterValue(event.target.value)
                        }
                        placeholder="Search players..."
                        className="w-full sm:max-w-xs"
                      />

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Moderation
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={showBanned ? "secondary" : "outline"}
                          onClick={() => {
                            setShowBanned((previous) => {
                              const next = !previous
                              table.setPageIndex(0)
                              return next
                            })
                          }}
                        >
                          {showBanned ? "Banned included" : "Banned hidden"}
                        </Button>
                      </div>
                    </div>

                    {isFiltered ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          table.resetColumnFilters()
                          table.setPageIndex(0)
                          setShowBanned(false)
                        }}
                      >
                        Reset filters
                      </Button>
                    ) : null}
                  </div>
                )
              }}
            />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Player drill-downs, item ownership, and moderation workflows will land
        here after Supabase RPC integration.
      </div>
    </section>
  )
}

export default PlayersPage
