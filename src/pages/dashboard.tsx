import * as React from "react"
import {
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react"

import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchCosmetics,
  fetchItemOwnershipSnapshots,
  fetchOwnershipEvents,
  fetchPlayers,
  type CosmeticRecord,
  type ItemOwnershipSnapshot,
  type OwnershipAction,
  type OwnershipEventRecord,
  type PlayerRecord,
} from "@/utils/supabase"

const numberFormatter = new Intl.NumberFormat("en-US")
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
})

const mintedActionSet: ReadonlySet<OwnershipAction> = new Set(["grant", "unbox"])

function normalizeMinecraftUuid(uuid: string | null): string | null {
  if (!uuid) {
    return null
  }

  const normalized = uuid.replace(/[^a-fA-F0-9]/g, "").toLowerCase()
  return normalized.length === 32 ? normalized : null
}

function buildPlayerAvatarUrl(player: PlayerRecord): string | null {
  const normalizedUuid = normalizeMinecraftUuid(player.minecraft_uuid)
  if (!normalizedUuid) {
    return null
  }

  const revisionSource =
    player.avatar_synced_at ??
    player.profile_synced_at ??
    player.updated_at ??
    player.created_at

  let revisionParam: string | null = null

  if (revisionSource) {
    const timestamp = Date.parse(revisionSource)
    if (!Number.isNaN(timestamp)) {
      revisionParam = String(timestamp)
    }
  }

  const searchParams = new URLSearchParams({
    size: "72",
  })

  if (revisionParam) {
    searchParams.set("rev", revisionParam)
  }

  return `/api/minecraft-profile/${normalizedUuid}/avatar?${searchParams.toString()}`
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = timestamp - now
  const absolute = Math.abs(diff)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (absolute < minute) {
    return relativeTimeFormatter.format(0, "minute")
  }

  if (absolute < hour) {
    return relativeTimeFormatter.format(Math.round(diff / minute), "minute")
  }

  if (absolute < day) {
    return relativeTimeFormatter.format(Math.round(diff / hour), "hour")
  }

  if (absolute < week) {
    return relativeTimeFormatter.format(Math.round(diff / day), "day")
  }

  return relativeTimeFormatter.format(Math.round(diff / week), "week")
}

export function DashboardPage() {
  const [cosmetics, setCosmetics] = React.useState<CosmeticRecord[]>([])
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [events, setEvents] = React.useState<OwnershipEventRecord[]>([])
  const [snapshots, setSnapshots] = React.useState<ItemOwnershipSnapshot[]>([])

  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayerRecord | null>(null)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = React.useState(false)

  const loadDashboardData = React.useCallback(
    async (options?: { soft?: boolean }) => {
      const soft = Boolean(options?.soft)

      if (soft) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const [
          cosmeticsData,
          playersData,
          snapshotsData,
          eventsData,
        ] = await Promise.all([
          fetchCosmetics(),
          fetchPlayers({ includeBanned: true }),
          fetchItemOwnershipSnapshots(),
          fetchOwnershipEvents({ limit: 400 }),
        ])

        setCosmetics(cosmeticsData)
        setPlayers(playersData)
        setSnapshots(snapshotsData)
        setEvents(eventsData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data from Supabase.",
        )
      } finally {
        if (soft) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  React.useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const playersById = React.useMemo(() => {
    const lookup = new Map<string, PlayerRecord>()
    for (const player of players) {
      if (!player.id) {
        continue
      }
      lookup.set(player.id, player)
    }
    return lookup
  }, [players])

  const activationInsights = React.useMemo(() => {
    const participants = new Set<string>()

    for (const event of events) {
      const toPlayer = event.to_player?.trim()
      if (toPlayer) {
        participants.add(toPlayer)
      }

      const fromPlayer = event.from_player?.trim()
      if (fromPlayer) {
        participants.add(fromPlayer)
      }
    }

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - day * 7
    const thirtyDaysAgo = now - day * 30

    let newPlayersLast30 = 0
    let newPlayersLast7 = 0
    let engagedNewPlayers = 0
    let activeCount = 0
    let bannedCount = 0

    for (const player of players) {
      const createdAt = parseTimestamp(player.created_at)
      const isBanned = player.is_banned === true

      if (isBanned) {
        bannedCount += 1
      } else {
        activeCount += 1
      }

      if (createdAt === null) {
        continue
      }

      if (createdAt >= thirtyDaysAgo) {
        newPlayersLast30 += 1
        if (participants.has(player.id)) {
          engagedNewPlayers += 1
        }
      }

      if (createdAt >= sevenDaysAgo) {
        newPlayersLast7 += 1
      }
    }

    const activationRate = newPlayersLast30 > 0
      ? engagedNewPlayers / newPlayersLast30
      : null

    return {
      participants,
      newPlayersLast30,
      newPlayersLast7,
      engagedNewPlayers,
      activationRate,
      activeCount,
      bannedCount,
    }
  }, [events, players])

  const eventAnalytics = React.useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const now = Date.now()
    const sevenDaysAgo = now - dayMs * 7
    const fourteenDaysAgo = now - dayMs * 14

    let totalLast7 = 0
    let mintedLast7 = 0
    let transferLast7 = 0
    let revokeLast7 = 0
    let totalPrev7 = 0
    let mintedPrev7 = 0
    let transferPrev7 = 0
    let revokePrev7 = 0

    for (const event of events) {
      const timestamp = parseTimestamp(event.occurred_at)
      if (timestamp === null) {
        continue
      }

      if (timestamp >= sevenDaysAgo) {
        totalLast7 += 1
        if (mintedActionSet.has(event.action)) {
          mintedLast7 += 1
        } else if (event.action === "transfer") {
          transferLast7 += 1
        } else if (event.action === "revoke") {
          revokeLast7 += 1
        }
      } else if (timestamp >= fourteenDaysAgo) {
        totalPrev7 += 1
        if (mintedActionSet.has(event.action)) {
          mintedPrev7 += 1
        } else if (event.action === "transfer") {
          transferPrev7 += 1
        } else if (event.action === "revoke") {
          revokePrev7 += 1
        }
      }
    }

    return {
      totalLast7,
      mintedLast7,
      transferLast7,
      revokeLast7,
      totalPrev7,
      mintedPrev7,
      transferPrev7,
      revokePrev7,
    }
  }, [events])

  const flowComparisons = React.useMemo(() => {
    const total = eventAnalytics.totalLast7

    return [
      {
        key: "minted",
        label: "Minted",
        value: eventAnalytics.mintedLast7,
        previous: eventAnalytics.mintedPrev7,
      },
      {
        key: "transfer",
        label: "Transfers",
        value: eventAnalytics.transferLast7,
        previous: eventAnalytics.transferPrev7,
      },
      {
        key: "revoke",
        label: "Reversals",
        value: eventAnalytics.revokeLast7,
        previous: eventAnalytics.revokePrev7,
      },
    ].map((entry) => ({
      ...entry,
      share: total > 0 ? entry.value / total : null,
    }))
  }, [eventAnalytics])

  const flowSummary = React.useMemo(() => {
    const totalDelta = eventAnalytics.totalLast7 - eventAnalytics.totalPrev7
    const mintedShare = eventAnalytics.totalLast7 > 0
      ? eventAnalytics.mintedLast7 / eventAnalytics.totalLast7
      : null

    return {
      totalDelta,
      mintedShare,
      hasBaseline: eventAnalytics.totalPrev7 > 0,
    }
  }, [eventAnalytics])

  const finishInsights = React.useMemo(() => {
    const totalItems = snapshots.length
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const finishMap = new Map<
      string,
      { count: number; fresh: number }
    >()

    let unassignedItems = 0

    for (const snapshot of snapshots) {
      const finish = snapshot.finish_type?.trim() || "Unspecified"
      const entry = finishMap.get(finish) ?? { count: 0, fresh: 0 }
      entry.count += 1

      const firstUnbox = parseTimestamp(snapshot.first_unbox_occurred_at)
      if (firstUnbox !== null && firstUnbox >= monthAgo) {
        entry.fresh += 1
      }

      if (!snapshot.latest_to_player_id) {
        unassignedItems += 1
      }

      finishMap.set(finish, entry)
    }

    const finishRows = Array.from(finishMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        share: totalItems > 0 ? data.count / totalItems : 0,
        fresh: data.fresh,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      totalItems,
      unassignedItems,
      finishRows,
    }
  }, [snapshots])

  const ownershipCoverage = React.useMemo(() => {
    const assigned = finishInsights.totalItems - finishInsights.unassignedItems
    const coverage = finishInsights.totalItems > 0
      ? assigned / finishInsights.totalItems
      : null

    return {
      assigned,
      coverage,
    }
  }, [finishInsights.totalItems, finishInsights.unassignedItems])

  const catalogHighlights = React.useMemo(() => {
    const exclusiveCosmetics = cosmetics.filter(
      (cosmetic) => cosmetic.exclusive_to_year !== null,
    )

    const exclusiveShare = cosmetics.length > 0
      ? exclusiveCosmetics.length / cosmetics.length
      : 0

    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const latestEntries = cosmetics
      .map((cosmetic) => {
        const lastTouched = parseTimestamp(cosmetic.updated_at) ??
          parseTimestamp(cosmetic.created_at) ??
          0
        return {
          id: cosmetic.id,
          name: cosmetic.name,
          type: cosmetic.type,
          exclusiveYear: cosmetic.exclusive_to_year,
          lastTouched,
        }
      })
      .filter((entry) => entry.lastTouched > 0)
      .sort((a, b) => b.lastTouched - a.lastTouched)
      .slice(0, 3)

    const freshExclusiveCount = exclusiveCosmetics.filter((cosmetic) => {
      const lastTouched = parseTimestamp(cosmetic.updated_at) ??
        parseTimestamp(cosmetic.created_at)
      return lastTouched !== null && lastTouched >= monthAgo
    }).length

    const typeMap = new Map<string, number>()
    for (const cosmetic of cosmetics) {
      const type = cosmetic.type?.trim() || "Uncategorized"
      typeMap.set(type, (typeMap.get(type) ?? 0) + 1)
    }

    const topTypes = Array.from(typeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        share: cosmetics.length > 0 ? count / cosmetics.length : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      exclusiveShare,
      freshExclusiveCount,
      latestEntries,
      topTypes,
    }
  }, [cosmetics])

  const overviewMetrics = React.useMemo(() => {
    const exclusiveDetail = percentFormatter.format(
      catalogHighlights.exclusiveShare || 0,
    )

    const unassignedDetail = finishInsights.totalItems > 0
      ? percentFormatter.format(
        finishInsights.unassignedItems / finishInsights.totalItems,
      )
      : "0%"

    const activationRate = activationInsights.activationRate

    return [
      {
        label: "Catalog breadth",
        icon: PackageSearch,
        value: numberFormatter.format(cosmetics.length),
        detail: `Exclusive share ${exclusiveDetail}`,
      },
      {
        label: "Minted inventory",
        icon: Sparkles,
        value: numberFormatter.format(finishInsights.totalItems),
        detail: `${numberFormatter.format(
          finishInsights.unassignedItems,
        )} unassigned (${unassignedDetail})`,
      },
      {
        label: "Active players",
        icon: Users2,
        value: numberFormatter.format(activationInsights.activeCount),
        detail: `${numberFormatter.format(
          activationInsights.newPlayersLast7,
        )} joined in 7 days`,
      },
      {
        label: "Ownership coverage",
        icon: ShieldCheck,
        value: ownershipCoverage.coverage !== null
          ? percentFormatter.format(ownershipCoverage.coverage)
          : "—",
        detail: `${numberFormatter.format(
          ownershipCoverage.assigned,
        )} assigned of ${numberFormatter.format(
          finishInsights.totalItems,
        )}`,
      },
      {
        label: "Activation rate",
        icon: TrendingUp,
        value: activationRate !== null
          ? percentFormatter.format(activationRate)
          : "—",
        detail: `${numberFormatter.format(
          activationInsights.engagedNewPlayers,
        )} of ${numberFormatter.format(
          activationInsights.newPlayersLast30,
        )} new players engaged`,
      },
    ]
  }, [
    activationInsights,
    catalogHighlights.exclusiveShare,
    cosmetics.length,
    finishInsights.totalItems,
    finishInsights.unassignedItems,
    ownershipCoverage.assigned,
    ownershipCoverage.coverage,
  ])

  const playerLeaderboard = React.useMemo(() => {
    const ownershipMap = new Map<
      string,
      { count: number; uniqueTypes: Set<string>; latest: number }
    >()

    for (const snapshot of snapshots) {
      const ownerId = snapshot.latest_to_player_id?.trim()
      if (!ownerId) {
        continue
      }

      const entry = ownershipMap.get(ownerId) ?? {
        count: 0,
        uniqueTypes: new Set<string>(),
        latest: 0,
      }

      entry.count += 1

      const finishType = snapshot.finish_type?.trim()
      if (finishType) {
        entry.uniqueTypes.add(finishType.toLowerCase())
      }

      const latestTimestamp = parseTimestamp(snapshot.latest_occurred_at)
      if (latestTimestamp !== null && latestTimestamp > entry.latest) {
        entry.latest = latestTimestamp
      }

      ownershipMap.set(ownerId, entry)
    }

    const assigned = finishInsights.totalItems - finishInsights.unassignedItems

    const rows = Array.from(ownershipMap.entries())
      .map(([playerId, data]) => {
        const player = playersById.get(playerId) ?? null

        const displayName = player?.display_name?.trim() ||
          (player?.minecraft_uuid
            ? player.minecraft_uuid.slice(0, 8)
            : playerId.slice(0, 8))

        const avatarUrl = player ? buildPlayerAvatarUrl(player) : null

        return {
          id: playerId,
          player,
          displayName,
          avatarUrl,
          ownedFinishes: data.count,
          uniqueTypes: data.uniqueTypes.size,
          share: assigned > 0 ? data.count / assigned : null,
          latest: data.latest,
        }
      })
      .sort((a, b) => {
        if (b.ownedFinishes !== a.ownedFinishes) {
          return b.ownedFinishes - a.ownedFinishes
        }
        if (b.uniqueTypes !== a.uniqueTypes) {
          return b.uniqueTypes - a.uniqueTypes
        }
        return b.latest - a.latest
      })
      .slice(0, 5)

    return {
      rows,
      trackedOwners: ownershipMap.size,
      assigned,
    }
  }, [
    finishInsights.totalItems,
    finishInsights.unassignedItems,
    playersById,
    snapshots,
  ])

  const handlePlayerSelect = React.useCallback((player: PlayerRecord | null) => {
    if (!player) {
      return
    }

    setSelectedPlayer(player)
    setIsProfileSheetOpen(true)
  }, [])

  const handleProfileSheetChange = React.useCallback((open: boolean) => {
    setIsProfileSheetOpen(open)
    if (!open) {
      setSelectedPlayer(null)
    }
  }, [])

  const isEmptyState = !isLoading &&
    cosmetics.length === 0 &&
    players.length === 0 &&
    events.length === 0 &&
    snapshots.length === 0

  const renderOverviewSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl border border-border/60" />
      ))}
    </div>
  )

  return (
    <>
      <section className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Operational intelligence
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Correlate catalog growth, player activation, and mint velocity to surface emerging risks and opportunities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void loadDashboardData({ soft: true })
              }}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh data
            </Button>
          </div>
        </header>

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void loadDashboardData()
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {isLoading ? (
        <>
          {renderOverviewSkeleton()}
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Skeleton className="h-72 rounded-xl border border-border/60" />
            <Skeleton className="h-72 rounded-xl border border-border/60" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
            <Skeleton className="h-80 rounded-xl border border-border/60" />
            <Skeleton className="h-80 rounded-xl border border-border/60" />
          </div>
        </>
      ) : isEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center">
          <p className="text-lg font-semibold text-foreground">
            We&apos;ll populate analytics once data starts flowing.
          </p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Connect Supabase tables for cosmetics, ownership events, players, and minted snapshots to unlock the full dashboard experience.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overviewMetrics.map((metric) => (
              <div
                key={metric.label}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <metric.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {metric.value}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Finish ownership leaderboard
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Top holders ranked by the finishes currently assigned to them.
                  </p>
                </div>
                <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {numberFormatter.format(playerLeaderboard.trackedOwners)} tracked owners
                </span>
              </div>

              {playerLeaderboard.rows.length ? (
                <div className="space-y-4">
                  {playerLeaderboard.rows.map((entry, index) => {
                    const rank = index + 1
                    const isClickable = Boolean(entry.player)
                    const clickHandler = isClickable
                      ? () => handlePlayerSelect(entry.player)
                      : undefined
                    const initial = entry.displayName.trim().charAt(0).toUpperCase() || "?"
                    const uniqueLabel = entry.uniqueTypes === 1
                      ? "1 finish type"
                      : `${entry.uniqueTypes} finish types`
                    const shareLabel = entry.share !== null
                      ? percentFormatter.format(entry.share)
                      : null
                    const activityLabel = entry.latest
                      ? `Updated ${formatRelativeTime(entry.latest)}`
                      : "Recent activity unknown"

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={clickHandler}
                        disabled={!isClickable}
                        className="flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-left transition hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-80"
                        aria-label={
                          entry.player
                            ? `Open profile for ${entry.displayName}`
                            : `${entry.displayName} profile unavailable`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card text-sm font-semibold text-muted-foreground">
                            #{rank}
                          </span>
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={`${entry.displayName} avatar`}
                              className="h-12 w-12 rounded border border-border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-muted text-sm font-medium uppercase text-muted-foreground">
                              {initial}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-[12rem] flex-1 flex-col">
                          <p className="text-sm font-semibold text-foreground">
                            {entry.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {uniqueLabel} • {activityLabel}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground sm:text-sm">
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-medium text-primary">
                            {numberFormatter.format(entry.ownedFinishes)} finishes
                          </span>
                          <span>
                            {shareLabel ? `${shareLabel} of assigned` : "Share unavailable"}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  Assign finishes to players to unlock leaderboard insights.
                </div>
              )}
            </div>
        </>
        )}
      </section>
      <PlayerProfileSheet
        player={selectedPlayer}
        open={isProfileSheetOpen}
        onOpenChange={handleProfileSheetChange}
      />
    </>
  )
}

export default DashboardPage
