import * as React from "react"
import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react"

import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCardWithIcon } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, percentFormatter, parseTimestamp, formatRelativeTime } from "@/lib/formatters"
import { buildPlayerAvatarUrl, createPlayerDisplayInfo } from "@/lib/player-utils"
import { isWithinTimeWindow } from "@/lib/time-utils"
import { usePlayersStore } from "@/stores/players-store"
import { useCosmeticsStore } from "@/stores/cosmetics-store"
import { useEventsStore } from "@/stores/events-store"
import { useSnapshotsStore } from "@/stores/snapshots-store"
import type { PlayerRecord } from "@/utils/supabase"



export function DashboardPage() {
  const [isRefreshingLocal, setIsRefreshingLocal] = React.useState(false)
  
  // Use stores for data management
  const playersStore = usePlayersStore()
  const cosmeticsStore = useCosmeticsStore()
  const eventsStore = useEventsStore()
  const snapshotsStore = useSnapshotsStore()

  // Get data from stores
  const cosmetics = useCosmeticsStore((state) => state.cosmetics)
  const players = usePlayersStore((state) => state.players)
  const events = useEventsStore((state) => state.events)
  const snapshots = useSnapshotsStore((state) => state.snapshots)

  // Get loading states
  const isLoading = playersStore.isLoading || cosmeticsStore.isLoading || eventsStore.isLoading || snapshotsStore.isLoading
  const isRefreshing = playersStore.isRefreshing || cosmeticsStore.isRefreshing || eventsStore.isRefreshing || snapshotsStore.isRefreshing || isRefreshingLocal
  const error = playersStore.error || cosmeticsStore.error || eventsStore.error || snapshotsStore.error
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  const [nowTimestamp, setNowTimestamp] = React.useState(() => Date.now())

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        playersStore.fetchPlayers({ includeBanned: true }),
        cosmeticsStore.fetchCosmetics(),
        eventsStore.fetchEvents({ limit: 400 }),
        snapshotsStore.fetchSnapshots(),
      ])
    }
    void fetchData()
  }, [playersStore, cosmeticsStore, eventsStore, snapshotsStore])

  // Refresh function
  const handleRefresh = React.useCallback(async () => {
    const startTime = Date.now()
    setIsRefreshingLocal(true)

    try {
      await Promise.all([
        playersStore.refreshPlayers(),
        cosmeticsStore.refreshCosmetics(),
        eventsStore.refreshEvents(),
        snapshotsStore.refreshSnapshots(),
      ])

      const refreshTime = Date.now() - startTime
      console.warn(`Dashboard refresh completed in ${refreshTime}ms, adding delay...`)

      // Add a small delay to make the refresh animation more visible
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.warn('Dashboard delay completed')
    } catch (error) {
      console.error('Dashboard refresh failed:', error)
    } finally {
      setIsRefreshingLocal(false)
    }
  }, [playersStore, cosmeticsStore, eventsStore, snapshotsStore])
  const dayInMs = 24 * 60 * 60 * 1000
  const sevenDaysAgo = nowTimestamp - 7 * dayInMs
  const thirtyDaysAgo = nowTimestamp - 30 * dayInMs

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

  React.useEffect(() => {
    setNowTimestamp(Date.now())
  }, [cosmetics, players, events, snapshots])

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

      if (isWithinTimeWindow(createdAt, thirtyDaysAgo)) {
        newPlayersLast30 += 1
        if (participants.has(player.id)) {
          engagedNewPlayers += 1
        }
      }

      if (isWithinTimeWindow(createdAt, sevenDaysAgo)) {
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
  }, [events, players, thirtyDaysAgo, sevenDaysAgo])




  const finishInsights = React.useMemo(() => {
    const totalItems = snapshots.length
    const monthAgo = thirtyDaysAgo
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
      if (firstUnbox !== null && isWithinTimeWindow(firstUnbox, monthAgo)) {
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
  }, [snapshots, thirtyDaysAgo])

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


  const overviewMetrics = React.useMemo(() => {
    return [
      {
        label: "Total Items Tracked",
        icon: Sparkles,
        value: numberFormatter.format(finishInsights.totalItems),
        detail: "Number of individual items we know of",
      },
      {
        label: "Active players",
        icon: Users2,
        value: numberFormatter.format(activationInsights.activeCount),
        detail: `${numberFormatter.format(
          activationInsights.newPlayersLast7,
        )} new players in the last 7 days`,
      },
      {
        label: "Ownership Coverage",
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
    ]
  }, [activationInsights, finishInsights.totalItems, ownershipCoverage.assigned, ownershipCoverage.coverage])

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

        const avatarUrl = player ? buildPlayerAvatarUrl(player, 72) : null

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

  // Analytics data processing

  const handlePlayerSelect = React.useCallback((player: PlayerRecord | null) => {
    if (!player) {
      return
    }
    playerProfile.openProfile(player)
  }, [playerProfile])


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
      <section className="space-y-6 sm:space-y-8 px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="transition-all hover:scale-105"
            >
              {isRefreshing ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Refreshing...</span>
                <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Refresh data</span>
                <span className="sm:hidden">Refresh</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {error ? (
          <ErrorDisplay
            error={error}
            onRetry={handleRefresh}
          />
        ) : null}

        {isLoading ? (
        <>
          {renderOverviewSkeleton()}
          {/* Analytics Skeleton */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Skeleton className="h-96 rounded-xl border border-border/60" />
              <Skeleton className="h-96 rounded-xl border border-border/60" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-80 rounded-xl border border-border/60" />
              <Skeleton className="h-80 rounded-xl border border-border/60" />
              <Skeleton className="h-80 rounded-xl border border-border/60" />
            </div>
          </div>
          {/* Leaderboard Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-80 rounded-xl border border-border/60" />
          </div>
        </>
      ) : isEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center">
          <p className="text-lg font-semibold text-foreground">
            We&apos;ll populate analytics once data starts flowing.
          </p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Connect Supabase tables for cosmetics, ownership events, players, and unboxed snapshots to unlock the full dashboard experience.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Metrics */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Key Metrics</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {overviewMetrics.map((metric) => (
                <StatCardWithIcon
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                  icon={metric.icon}
                  isLoading={isLoading || isRefreshing}
                />
              ))}
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Users2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    Finish Ownership Leaderboard
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Top holders ranked by the finishes currently assigned to them
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground self-start sm:self-auto">
                {numberFormatter.format(playerLeaderboard.trackedOwners)} tracked owners
              </span>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-6 shadow-sm">
              {isRefreshing ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing leaderboard...
                </div>
              ) : playerLeaderboard.rows.length ? (
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
                        className="flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-4 text-left transition-all hover:border-border hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-80"
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
                          {entry.player ? (
                            <PlayerAvatar 
                              profile={createPlayerDisplayInfo(entry.player)} 
                              size="lg" 
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
          </div>
        </>
        )}
      </section>
      <PlayerProfileSheet
        player={playerProfile.selectedPlayer}
        open={playerProfile.isProfileOpen}
        onOpenChange={playerProfile.handleOpenChange}
      />
    </>
  )
}

export default DashboardPage
