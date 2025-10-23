import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerStatusBadge } from "@/components/player-status-badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { numberFormatter, dateFormatter, dateTimeFormatter } from "@/lib/formatters"
import { normalizeMinecraftUuid, buildPlayerAvatarUrl, createPlayerDisplayInfo } from "@/lib/player-utils"
import { fetchPlayers, type PlayerRecord } from "@/utils/supabase"

const AVATAR_IMAGE_SIZE = 72
const AVATAR_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000
const AVATAR_SYNC_CONCURRENCY = 4


function shouldRefreshAvatar(player: PlayerRecord): boolean {
  if (!player.avatar_storage_path || !player.avatar_synced_at) {
    return true
  }

  const lastSynced = Date.parse(player.avatar_synced_at)
  if (Number.isNaN(lastSynced)) {
    return true
  }

  return Date.now() - lastSynced > AVATAR_CACHE_MAX_AGE_MS
}

function shouldRefreshProfile(player: PlayerRecord): boolean {
  if (!player.profile_synced_at) {
    return true
  }

  const lastSynced = Date.parse(player.profile_synced_at)
  if (Number.isNaN(lastSynced)) {
    return true
  }

  return Date.now() - lastSynced > AVATAR_CACHE_MAX_AGE_MS
}

type PlayerRow = {
  record: PlayerRecord
  id: string
  displayName: string
  avatarUrl: string | null
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

function createPlayerColumns(
  onPlayerClick: (row: PlayerRow) => void,
): ColumnDef<PlayerRow>[] {
  return [
    {
      accessorKey: "displayName",
      header: "Player",
      cell: ({ row }) => {
        const handleClick = () => onPlayerClick(row.original)
        const playerDisplayInfo = createPlayerDisplayInfo(row.original.record, AVATAR_IMAGE_SIZE)

        return (
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-3 rounded-md border border-transparent p-1.5 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Open profile for ${row.original.displayName}`}
          >
            <PlayerAvatar profile={playerDisplayInfo} size="md" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{row.original.displayName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.original.minecraftUuid}
              </p>
            </div>
          </button>
        )
      },
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
        <PlayerStatusBadge isBanned={row.original.isBanned} />
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
}

export function PlayersPage() {
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showBanned, setShowBanned] = React.useState(false)
  const [isUpdatingPlayers, setisUpdatingPlayers] = React.useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)

  const loadPlayers = React.useCallback(async (options?: { forceRefresh?: boolean }) => {
    const forceRefresh = options?.forceRefresh ?? false
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPlayers({
        includeBanned: true,
        forceRefresh,
      })
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

  const handlePlayerClick = React.useCallback(
    (row: PlayerRow) => {
      setSelectedPlayerId(row.id)
      setIsProfileOpen(true)
    },
    [setIsProfileOpen, setSelectedPlayerId],
  )

  const handleProfileOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setIsProfileOpen(nextOpen)
      if (!nextOpen) {
        setSelectedPlayerId(null)
      }
    },
    [setIsProfileOpen, setSelectedPlayerId],
  )

  const syncAvatars = React.useCallback(async () => {
    if (!players.length || isUpdatingPlayers) {
      return
    }

    setisUpdatingPlayers(true)

    try {
      const staleCandidates = players.filter(shouldRefreshAvatar)
      const candidateList = staleCandidates.length ? staleCandidates : players
      const forceFullRefresh = staleCandidates.length === 0
      const seen = new Set<string>()
      const targets = candidateList
        .map((player) => ({
          player,
          normalizedUuid: normalizeMinecraftUuid(player.minecraft_uuid),
        }))
        .filter(
          (
            entry,
          ): entry is {
            player: PlayerRecord
            normalizedUuid: string
          } => {
            if (!entry.normalizedUuid) {
              return false
            }

            if (seen.has(entry.normalizedUuid)) {
              return false
            }

            seen.add(entry.normalizedUuid)
            return true
          },
        )

      if (!targets.length) {
        return
      }

      let didMutate = false
      const chunkSize = Math.ceil(targets.length / AVATAR_SYNC_CONCURRENCY)
      const workers: Array<Promise<void>> = []

      for (let index = 0; index < targets.length; index += chunkSize) {
        const chunk = targets.slice(index, index + chunkSize)
        workers.push(
          (async () => {
            for (const { player, normalizedUuid } of chunk) {
              if (forceFullRefresh || shouldRefreshProfile(player)) {
                try {
                  await fetch(`/api/minecraft-profile/${normalizedUuid}`, {
                    method: "GET",
                    cache: "no-store",
                  })
                  didMutate = true
                } catch (profileError) {
                  console.error("Failed to warm profile cache", {
                    uuid: normalizedUuid,
                    error: profileError,
                  })
                }
              }

              try {
                const avatarResponse = await fetch(
                  `/api/minecraft-profile/${normalizedUuid}/avatar?size=${AVATAR_IMAGE_SIZE}`,
                  {
                    method: "GET",
                    cache: "no-store",
                  },
                )

                if (avatarResponse.ok) {
                  await avatarResponse.arrayBuffer().catch(() => null)
                  didMutate = true
                } else {
                  await avatarResponse.json().catch(() => null)
                }
              } catch (avatarError) {
                console.error("Failed to warm avatar cache", {
                  uuid: normalizedUuid,
                  error: avatarError,
                })
              }
            }
          })(),
        )
      }

      await Promise.all(workers)

      if (didMutate) {
        // Give the edge function a brief moment to finish background uploads before reloading data.
        await new Promise((resolve) => setTimeout(resolve, 750))
        await loadPlayers({ forceRefresh: true })
      }
    } finally {
      setisUpdatingPlayers(false)
    }
  }, [players, isUpdatingPlayers, loadPlayers])

  const columns = React.useMemo(
    () => createPlayerColumns(handlePlayerClick),
    [handlePlayerClick],
  )

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
        record: player,
        id: player.id,
        displayName,
        avatarUrl: buildPlayerAvatarUrl(player, AVATAR_IMAGE_SIZE),
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

  const selectedPlayer = React.useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  )

  const isProfileSheetOpen = Boolean(selectedPlayer) && isProfileOpen

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
      tableData[0]!,
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
    <>
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

      <div className="grid gap-4 md:grid-cols-2">
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
              columns={columns}
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
                    </div>
                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isUpdatingPlayers || !players.length}
                        onClick={() => {
                          void syncAvatars()
                        }}
                      >
                        {isUpdatingPlayers ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Updating player data
                          </>
                        ) : (
                          "Update player data"
                        )}
                      </Button>

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
                  </div>
                )
              }}
            />
          )}
        </div>
      </div>
    </section>
    
      <PlayerProfileSheet
        player={selectedPlayer}
        open={isProfileSheetOpen}
        onOpenChange={handleProfileOpenChange}
      />
    </>
  )
}

export default PlayersPage
