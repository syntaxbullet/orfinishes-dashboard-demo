/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerStatusBadge } from "@/components/player-status-badge"
import { StatCard } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { DataTableToolbar, DataTableSearch, DataTableRefresh } from "@/components/data-table-toolbar"
import { DataTable } from "@/components/ui/data-table"
import { useDataLoader } from "@/hooks/use-data-loader"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, dateTimeFormatter, dateFormatter } from "@/lib/formatters"
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
        const playerDisplayInfo = createPlayerDisplayInfo(row.original.record)

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
  const [showBanned, setShowBanned] = React.useState(false)
  const [isUpdatingPlayers, setisUpdatingPlayers] = React.useState(false)

  // Use the data loader hook for managing loading states
  const dataLoader = useDataLoader(async () => {
    return await fetchPlayers({ includeBanned: true })
  })

  const players = dataLoader.data || []
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  const handlePlayerClick = React.useCallback(
    (row: PlayerRow) => {
      const player = players.find(p => p.id === row.id)
      if (player) {
        playerProfile.openProfile(player)
      }
    },
    [players, playerProfile],
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
        await dataLoader.load({ forceRefresh: true })
      }
    } finally {
      setisUpdatingPlayers(false)
    }
  }, [players, isUpdatingPlayers, dataLoader])

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
          Explore player profiles, unboxing eligibility, and moderation status
          pulled from `public.players`.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            isLoading={dataLoader.isLoading}
          />
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
          {dataLoader.error ? (
            <ErrorDisplay
              error={dataLoader.error}
              title="Failed to load player data."
              onRetry={() => {
                void dataLoader.load()
              }}
            />
          ) : dataLoader.isLoading ? (
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
                  <DataTableToolbar
                    hasFilters={isFiltered}
                    onReset={() => {
                      table.resetColumnFilters()
                      table.setPageIndex(0)
                      setShowBanned(false)
                    }}
                  >
                    <DataTableSearch
                      column={nameColumn}
                      placeholder="Search players..."
                    />
                    <DataTableRefresh
                      isRefreshing={isUpdatingPlayers}
                      onRefresh={() => {
                        void syncAvatars()
                      }}
                      refreshText="Update player data"
                      refreshingText="Updating player data"
                    />
                  </DataTableToolbar>
                )
              }}
            />
          )}
        </div>
      </div>
    </section>
    
      <PlayerProfileSheet
        player={playerProfile.selectedPlayer}
        open={playerProfile.isProfileOpen}
        onOpenChange={playerProfile.handleOpenChange}
      />
    </>
  )
}

export default PlayersPage
