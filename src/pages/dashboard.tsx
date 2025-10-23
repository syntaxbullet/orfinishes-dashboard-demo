import * as React from "react"
import {
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react"

import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCardWithIcon } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, BarChart, AreaChart, PieChart } from "@/components/charts"
import { TrendIndicator } from "@/components/trend-indicator"
import { useDataLoader } from "@/hooks/use-data-loader"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, percentFormatter, shortDateFormatter, relativeTimeFormatter, parseTimestamp, formatRelativeTime } from "@/lib/formatters"
import { normalizeMinecraftUuid, buildPlayerAvatarUrl, createPlayerDisplayInfo } from "@/lib/player-utils"
import { timeWindows, isWithinTimeWindow } from "@/lib/time-utils"
import { 
  calculateTrend, 
  generateTimeSeriesData, 
  generatePlayerGrowthData, 
  generateFinishTypeDistribution,
  type TrendData 
} from "@/lib/analytics-utils"
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

const unboxedActionSet: ReadonlySet<OwnershipAction> = new Set(["grant", "unbox"])


export function DashboardPage() {
  // Use the data loader hook for managing loading states
  const dataLoader = useDataLoader(async () => {
    const [cosmeticsData, playersData, snapshotsData, eventsData] = await Promise.all([
      fetchCosmetics(),
      fetchPlayers({ includeBanned: true }),
      fetchItemOwnershipSnapshots(),
      fetchOwnershipEvents({ limit: 400 }),
    ])
    return { cosmetics: cosmeticsData, players: playersData, snapshots: snapshotsData, events: eventsData }
  })

  const { cosmetics, players, events, snapshots } = dataLoader.data || { cosmetics: [], players: [], events: [], snapshots: [] }
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  // Time window calculations using the new utility
  const sevenDaysAgo = timeWindows.last7Days()
  const thirtyDaysAgo = timeWindows.last30Days()

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
  }, [events, players])

  const eventAnalytics = React.useMemo(() => {
    const now = Date.now()
    const fourteenDaysAgo = timeWindows.last14Days()

    let totalLast7 = 0
    let unboxedLast7 = 0
    let transferLast7 = 0
    let revokeLast7 = 0
    let totalPrev7 = 0
    let unboxedPrev7 = 0
    let transferPrev7 = 0
    let revokePrev7 = 0

    for (const event of events) {
      const timestamp = parseTimestamp(event.occurred_at)
      if (timestamp === null) {
        continue
      }

      if (isWithinTimeWindow(timestamp, sevenDaysAgo)) {
        totalLast7 += 1
        if (unboxedActionSet.has(event.action)) {
          unboxedLast7 += 1
        } else if (event.action === "transfer") {
          transferLast7 += 1
        } else if (event.action === "revoke") {
          revokeLast7 += 1
        }
      } else if (isWithinTimeWindow(timestamp, fourteenDaysAgo)) {
        totalPrev7 += 1
        if (unboxedActionSet.has(event.action)) {
          unboxedPrev7 += 1
        } else if (event.action === "transfer") {
          transferPrev7 += 1
        } else if (event.action === "revoke") {
          revokePrev7 += 1
        }
      }
    }

    return {
      totalLast7,
      unboxedLast7,
      transferLast7,
      revokeLast7,
      totalPrev7,
      unboxedPrev7,
      transferPrev7,
      revokePrev7,
    }
  }, [events])

  const flowComparisons = React.useMemo(() => {
    const total = eventAnalytics.totalLast7

    return [
      {
        key: "unboxed",
        label: "Unboxed",
        value: eventAnalytics.unboxedLast7,
        previous: eventAnalytics.unboxedPrev7,
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
    const unboxedShare = eventAnalytics.totalLast7 > 0
      ? eventAnalytics.unboxedLast7 / eventAnalytics.totalLast7
      : null

    return {
      totalDelta,
      unboxedShare,
      hasBaseline: eventAnalytics.totalPrev7 > 0,
    }
  }, [eventAnalytics])

  const finishInsights = React.useMemo(() => {
    const totalItems = snapshots.length
    const monthAgo = timeWindows.last30Days()
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

    const monthAgo = timeWindows.last30Days()
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
      return lastTouched !== null && isWithinTimeWindow(lastTouched, monthAgo)
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
        label: "Cosmetics Available",
        icon: PackageSearch,
        value: numberFormatter.format(cosmetics.length),
        detail: `Exclusive share ${exclusiveDetail}`,
      },
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
      {
        label: "Engagement rate",
        icon: TrendingUp,
        value: activationRate !== null
          ? percentFormatter.format(activationRate)
          : "—",
        detail: `${numberFormatter.format(
          activationInsights.engagedNewPlayers,
        )} of ${numberFormatter.format(
          activationInsights.newPlayersLast30,
        )} players engaged in the last 30 days`,
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
  const analyticsData = React.useMemo(() => {
    const last30Days = timeWindows.last30Days()
    const last7Days = timeWindows.last7Days()
    const last14Days = timeWindows.last14Days()

    // Generate time series data for events
    const eventTimeSeries = generateTimeSeriesData(events, { start: last30Days, end: Date.now() }, "day")
    const playerGrowthData = generatePlayerGrowthData(players, { start: last30Days, end: Date.now() }, "day")
    const finishDistribution = generateFinishTypeDistribution(snapshots)

    // Calculate trends
    const totalEventsTrend = calculateTrend(
      eventAnalytics.totalLast7,
      eventAnalytics.totalPrev7
    )
    const unboxedTrend = calculateTrend(
      eventAnalytics.unboxedLast7,
      eventAnalytics.unboxedPrev7
    )
    const playerGrowthTrend = calculateTrend(
      activationInsights.newPlayersLast7,
      activationInsights.newPlayersLast30 - activationInsights.newPlayersLast7
    )

    return {
      eventTimeSeries,
      playerGrowthData,
      finishDistribution,
      trends: {
        totalEvents: totalEventsTrend,
        unboxed: unboxedTrend,
        playerGrowth: playerGrowthTrend,
      }
    }
  }, [events, players, snapshots, eventAnalytics, activationInsights])

  const handlePlayerSelect = React.useCallback((player: PlayerRecord | null) => {
    if (!player) {
      return
    }
    playerProfile.openProfile(player)
  }, [playerProfile])

  const handleProfileSheetChange = playerProfile.handleOpenChange

  const isEmptyState = !dataLoader.isLoading &&
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
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive overview of your ORFinishes system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void dataLoader.refresh()
              }}
              disabled={dataLoader.isRefreshing || dataLoader.isLoading}
              className="transition-all hover:scale-105"
            >
              {dataLoader.isRefreshing ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
                </>
              ) : (
                <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh data
                </>
              )}
            </Button>
          </div>
        </header>

        {dataLoader.error ? (
          <ErrorDisplay
            error={dataLoader.error}
            onRetry={() => {
              void dataLoader.load()
            }}
          />
        ) : null}

        {dataLoader.isLoading ? (
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
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Key Metrics</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overviewMetrics.map((metric) => (
                <StatCardWithIcon
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                  icon={metric.icon}
                  isLoading={dataLoader.isLoading}
                />
              ))}
            </div>
          </div>

          {/* Analytics Charts Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Comprehensive insights into system activity and trends</p>
                </div>
              </div>
            </div>

            {/* Activity Trends - Full Width */}
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <LineChart
                  data={analyticsData.eventTimeSeries}
                  lines={[
                    { dataKey: "total", name: "Total Events", color: "#3b82f6", strokeWidth: 3 },
                    { dataKey: "unboxed", name: "Unboxed", color: "#10b981", strokeWidth: 2 },
                    { dataKey: "transfers", name: "Transfers", color: "#f59e0b", strokeWidth: 2 },
                    { dataKey: "revokes", name: "Revokes", color: "#ef4444", strokeWidth: 2 },
                  ]}
                  title="Activity Over Time"
                  description="Daily breakdown of ownership events in the last 30 days"
                  height={350}
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <AreaChart
                  data={analyticsData.playerGrowthData}
                  areas={[
                    { dataKey: "new", name: "New Players", color: "#8b5cf6", fillOpacity: 0.3 },
                    { dataKey: "total", name: "Total Players", color: "#3b82f6", fillOpacity: 0.1 },
                  ]}
                  title="Player Growth"
                  description="New player registrations and cumulative growth"
                  height={350}
                />
              </div>
            </div>

            {/* Distribution and Trends - Three Column */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <PieChart
                  data={analyticsData.finishDistribution}
                  title="Finish Type Distribution"
                  description="Breakdown of items by finish type"
                  height={320}
                  showLabel={true}
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Activity Trends</h3>
                    <p className="text-sm text-muted-foreground">Week-over-week comparison</p>
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-lg bg-muted/30 p-4">
                      <TrendIndicator
                        trend={analyticsData.trends.totalEvents}
                        label="Total Events"
                        size="lg"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4">
                      <TrendIndicator
                        trend={analyticsData.trends.unboxed}
                        label="Unboxed Items"
                        size="lg"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4">
                      <TrendIndicator
                        trend={analyticsData.trends.playerGrowth}
                        label="New Players"
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <BarChart
                  data={flowComparisons.map(({ share, ...rest }) => rest)}
                  bars={[
                    { dataKey: "value", name: "This Week", color: "#3b82f6" },
                    { dataKey: "previous", name: "Previous Week", color: "#6b7280" },
                  ]}
                  title="Event Flow Comparison"
                  description="Week-over-week event breakdown"
                  height={320}
                  xAxisKey="label"
                />
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Users2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Finish Ownership Leaderboard
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Top holders ranked by the finishes currently assigned to them
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                {numberFormatter.format(playerLeaderboard.trackedOwners)} tracked owners
              </span>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">

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
                              profile={createPlayerDisplayInfo(entry.player, 72)} 
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
