import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCard } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { DataTableToolbar, DataTableSearch, DataTableFilter, DataTableRefresh } from "@/components/data-table-toolbar"
import { useDataLoader } from "@/hooks/use-data-loader"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, dateTimeFormatter } from "@/lib/formatters"
import { createPlayerDisplayInfo, createPlayerLookupMap, resolvePlayerByIdentifier, createFallbackPlayerDisplayInfo, type PlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  fetchCosmeticsByIds,
  fetchItemsByIds,
  fetchOwnershipEvents,
  fetchPlayers,
  type CosmeticRecord,
  type ItemRecord,
  type OwnershipAction,
  type PlayerRecord,
} from "@/utils/supabase"

const PARTICIPANT_AVATAR_SIZE = 40

type ItemMetadata = {
  name: string
  finishType: string | null
}

function buildParticipantProfile(player: PlayerRecord): PlayerDisplayInfo {
  return createPlayerDisplayInfo(player, PARTICIPANT_AVATAR_SIZE)
}

type OwnershipEventRow = {
  id: string
  action: OwnershipAction
  itemId: string
  itemName: string
  itemDetail: string
  fromPlayer: string | null
  toPlayer: string | null
  fromProfile: PlayerDisplayInfo | null
  toProfile: PlayerDisplayInfo | null
  occurredAt: string
  occurredDisplay: string
  occurredTimestamp: number
  searchableText: string
}

const ACTION_LABELS: Record<OwnershipAction, string> = {
  grant: "Grant",
  transfer: "Transfer",
  unbox: "Unbox",
  revoke: "Revoke",
}

const ACTION_ORDER: Record<OwnershipAction, number> = {
  grant: 0,
  transfer: 1,
  unbox: 2,
  revoke: 3,
}

const ACTION_STYLES: Record<OwnershipAction, string> = {
  grant: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  transfer: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  unbox: "border-violet-500/40 bg-violet-500/10 text-violet-600",
  revoke: "border-destructive/40 bg-destructive/10 text-destructive",
}

function getParticipantLabel(
  action: OwnershipAction,
  direction: "from" | "to",
): string {
  if (direction === "to") {
    switch (action) {
      case "unbox":
        return "Unboxed to"
      case "grant":
        return "Granted to"
      case "transfer":
        return "Transferred to"
      case "revoke":
        return "Returned to"
      default:
        return "Recipient"
    }
  }

  switch (action) {
    case "revoke":
      return "Revoked from"
    case "transfer":
      return "Transferred from"
    case "grant":
      return "Granted from"
    default:
      return "From"
  }
}

function ParticipantAvatar({
  profile,
}: {
  profile: PlayerDisplayInfo
}) {
  return <PlayerAvatar profile={profile} className="rounded" />
}

function ParticipantPreview({
  profile,
  label,
  onSelect,
}: {
  profile: PlayerDisplayInfo
  label?: string
  onSelect?: (profile: PlayerDisplayInfo) => void
}) {
  const content = (
    <>
      <ParticipantAvatar profile={profile} />
      <div className="leading-tight">
        <p className="text-sm font-medium text-foreground">{profile.displayName}</p>
        {label ? (
          <p className="text-xs text-muted-foreground">{label}</p>
        ) : null}
      </div>
    </>
  )

  if (!onSelect) {
    return <div className="flex items-center gap-2">{content}</div>
  }

  const handleClick = () => onSelect(profile)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-2 rounded-md border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      aria-label={`Open profile for ${profile.displayName}`}
    >
      {content}
    </button>
  )
}

function createOwnershipEventColumns(
  onParticipantClick: (profile: PlayerDisplayInfo) => void,
): ColumnDef<OwnershipEventRow>[] {
  return [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            ACTION_STYLES[row.original.action],
          )}
        >
          {ACTION_LABELS[row.original.action]}
        </span>
      ),
      sortingFn: (a, b) =>
        ACTION_ORDER[a.original.action] - ACTION_ORDER[b.original.action],
    },
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{row.original.itemName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.original.itemDetail}
          </p>
        </div>
      ),
      filterFn: (row, _columnId, value) => {
        const search = String(value ?? "").trim().toLowerCase()
        if (!search) {
          return true
        }

        return row.original.searchableText.includes(search)
      },
      sortingFn: (a, b) =>
        a.original.itemName.localeCompare(b.original.itemName),
    },
    {
      accessorKey: "participants",
      header: "Participants",
      cell: ({ row }) => {
        const { action, fromProfile, toProfile } = row.original

        if (fromProfile && toProfile) {
          return (
            <div className="flex flex-col gap-2">
              <ParticipantPreview
                profile={fromProfile}
                label={getParticipantLabel(action, "from")}
                onSelect={onParticipantClick}
              />
              <ParticipantPreview
                profile={toProfile}
                label={getParticipantLabel(action, "to")}
                onSelect={onParticipantClick}
              />
            </div>
          )
        }

        if (toProfile) {
          return (
            <ParticipantPreview
              profile={toProfile}
              label={getParticipantLabel(action, "to")}
              onSelect={onParticipantClick}
            />
          )
        }

        if (fromProfile) {
          return (
            <ParticipantPreview
              profile={fromProfile}
              label={getParticipantLabel(action, "from")}
              onSelect={onParticipantClick}
            />
          )
        }

        return <span className="text-sm text-muted-foreground">No participant data</span>
      },
      sortingFn: (a, b) => {
        const left = [
          a.original.fromProfile?.displayName ?? "",
          a.original.toProfile?.displayName ?? "",
        ].join(" ")
        const right = [
          b.original.fromProfile?.displayName ?? "",
          b.original.toProfile?.displayName ?? "",
        ].join(" ")
        return left.localeCompare(right)
      },
    },
    {
      accessorKey: "occurredAt",
      header: "Occurred",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.occurredDisplay}
        </span>
      ),
      sortingFn: (a, b) =>
        a.original.occurredTimestamp - b.original.occurredTimestamp,
    },
  ]
}

const ACTION_OPTIONS: Array<OwnershipAction | "all"> = [
  "all",
  "grant",
  "transfer",
  "unbox",
  "revoke",
]

export function EventsPage() {
  const [actionFilter, setActionFilter] = React.useState<
    OwnershipAction | "all"
  >("all")

  // Use the data loader hook for managing loading states
  const dataLoader = useDataLoader(async () => {
    const eventsData = await fetchOwnershipEvents({})
    
    const uniqueItemIds = Array.from(
      new Set(
        eventsData
          .map((event) => (event.item_id ? event.item_id.trim() : ""))
          .filter((value) => value.length > 0),
      ),
    )

    const [playersData, itemsData] = await Promise.allSettled([
      fetchPlayers({ includeBanned: true }),
      uniqueItemIds.length
        ? fetchItemsByIds(uniqueItemIds)
        : Promise.resolve([] as ItemRecord[]),
    ])

    const players = playersData.status === "fulfilled" ? playersData.value : []
    const items = itemsData.status === "fulfilled" ? itemsData.value : []

    let cosmetics: CosmeticRecord[] = []
    if (items.length) {
      const uniqueCosmeticIds = Array.from(
        new Set(
          items
            .map((item) => (item.cosmetic ? item.cosmetic.trim() : ""))
            .filter((value) => value.length > 0),
        ),
      )

      if (uniqueCosmeticIds.length) {
        try {
          cosmetics = await fetchCosmeticsByIds(uniqueCosmeticIds)
        } catch (cosmeticError) {
          console.error("Failed to load cosmetics for ownership events table", cosmeticError)
        }
      }
    }

    return { events: eventsData, players, items, cosmetics }
  })

  const { events, players, items, cosmetics } = dataLoader.data || { events: [], players: [], items: [], cosmetics: [] }
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  // Create player lookup map using the new utility
  const playerLookup = React.useMemo(() => createPlayerLookupMap(players), [players])

  const handleParticipantClick = React.useCallback(
    (profile: PlayerDisplayInfo) => {
      const player = resolvePlayerByIdentifier(profile.id, playerLookup)
      if (player) {
        playerProfile.openProfile(player)
      }
    },
    [playerLookup, playerProfile],
  )

  const columns = React.useMemo(
    () => createOwnershipEventColumns(handleParticipantClick),
    [handleParticipantClick],
  )

  const cosmeticLookup = React.useMemo(() => {
    const lookup = new Map<string, CosmeticRecord>()

    for (const cosmetic of cosmetics) {
      lookup.set(cosmetic.id, cosmetic)
    }

    return lookup
  }, [cosmetics])

  const itemLookup = React.useMemo(() => {
    const lookup = new Map<string, ItemMetadata>()

    for (const item of items) {
      const cosmeticId = item.cosmetic ? item.cosmetic.trim() : ""
      const cosmetic = cosmeticLookup.get(cosmeticId)
      const name = cosmetic?.name?.trim() || item.id
      const finishType = item.finish_type ? item.finish_type.trim() : null

      lookup.set(item.id, {
        name,
        finishType,
      })
    }

    return lookup
  }, [items, cosmeticLookup])

  const tableData = React.useMemo<OwnershipEventRow[]>(() => {
    const resolveParticipant = (identifier: string | null): PlayerDisplayInfo | null => {
      if (!identifier) {
        return null
      }

      const player = resolvePlayerByIdentifier(identifier, playerLookup)
      if (player) {
        return buildParticipantProfile(player)
      }

      return createFallbackPlayerDisplayInfo(identifier, PARTICIPANT_AVATAR_SIZE)
    }

    return events.map((event) => {
      const occurredTimestamp = Date.parse(event.occurred_at)
      const isValidTimestamp = !Number.isNaN(occurredTimestamp)

      const itemMeta = itemLookup.get(event.item_id)
      const itemName = itemMeta?.name ?? event.item_id
      const itemDetail = itemMeta?.finishType
        ? `${itemMeta.finishType} · ${event.item_id}`
        : event.item_id

      const fromProfile = resolveParticipant(event.from_player)
      const toProfile = resolveParticipant(event.to_player)

      const searchTokens = [
        event.item_id,
        itemName,
        itemMeta?.finishType ?? "",
        event.from_player ?? "",
        event.to_player ?? "",
        fromProfile?.displayName ?? "",
        toProfile?.displayName ?? "",
        ACTION_LABELS[event.action],
      ]

      return {
        id: event.id,
        action: event.action,
        itemId: event.item_id,
        itemName,
        itemDetail,
        fromPlayer: event.from_player,
        toPlayer: event.to_player,
        fromProfile,
        toProfile,
        occurredAt: event.occurred_at,
        occurredDisplay: isValidTimestamp
          ? dateTimeFormatter.format(new Date(occurredTimestamp))
          : "—",
        occurredTimestamp: isValidTimestamp ? occurredTimestamp : -Infinity,
        searchableText: searchTokens
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      }
    })
  }, [events, itemLookup, playerLookup])


  const filteredEvents = React.useMemo(() => {
    if (actionFilter === "all") {
      return tableData
    }

    return tableData.filter((event) => event.action === actionFilter)
  }, [actionFilter, tableData])

  const isBusy = dataLoader.isLoading || dataLoader.isRefreshing

  const statCards = React.useMemo(() => {
    if (!tableData.length) {
      return [
        {
          label: "Recorded events",
          value: "0",
          detail: "No ownership events recorded yet.",
        },
        {
          label: "Latest activity",
          value: "—",
          detail: "Awaiting the first ownership event.",
        },
        {
          label: "Unique participants",
          value: "0",
          detail: "No players associated with ownership events.",
        },
      ]
    }

    const actionCounts = new Map<OwnershipAction, number>()
    for (const action of Object.keys(ACTION_LABELS) as OwnershipAction[]) {
      actionCounts.set(action, 0)
    }

    const uniqueItems = new Set<string>()
    const uniqueParticipants = new Set<string>()
    let latestEvent: OwnershipEventRow | null = null

    for (const event of tableData) {
      actionCounts.set(event.action, (actionCounts.get(event.action) ?? 0) + 1)
      uniqueItems.add(event.itemId)

      if (event.fromProfile) {
        uniqueParticipants.add(event.fromProfile.id)
      } else if (event.fromPlayer) {
        uniqueParticipants.add(event.fromPlayer)
      }

      if (event.toProfile) {
        uniqueParticipants.add(event.toProfile.id)
      } else if (event.toPlayer) {
        uniqueParticipants.add(event.toPlayer)
      }

      if (!latestEvent || event.occurredTimestamp > latestEvent.occurredTimestamp) {
        latestEvent = event
      }
    }

    const actionSummary = Array.from(actionCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => ACTION_ORDER[a[0]] - ACTION_ORDER[b[0]])
      .map(([action, count]) =>
        `${ACTION_LABELS[action]} ${numberFormatter.format(count)}`,
      )
      .join(" · ")

    const latestParticipants = latestEvent
      ? latestEvent.fromProfile && latestEvent.toProfile
        ? `${latestEvent.fromProfile.displayName} → ${latestEvent.toProfile.displayName}`
        : latestEvent.toProfile
          ? `to ${latestEvent.toProfile.displayName}`
          : latestEvent.fromProfile
            ? `from ${latestEvent.fromProfile.displayName}`
            : "No participant data"
      : null

    return [
      {
        label: "Recorded events",
        value: numberFormatter.format(tableData.length),
        detail: actionSummary || "Awaiting ownership activity.",
      },
      {
        label: "Latest activity",
        value: latestEvent?.occurredDisplay ?? "—",
        detail: latestEvent
          ? `${ACTION_LABELS[latestEvent.action]} ${latestParticipants ?? ""}`.trim()
          : "Awaiting the first ownership event.",
      },
      {
        label: "Unique participants",
        value: numberFormatter.format(uniqueParticipants.size),
        detail: `Items touched ${numberFormatter.format(uniqueItems.size)}`,
      },
    ]
  }, [tableData])


  return (
    <>
      <section className="space-y-4 sm:space-y-6 px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
      <header className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Ownership Events
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Review the event ledger for grants, transfers, unboxes, and revokes
          sourced from `public.ownership_events`.
        </p>
      </header>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            isLoading={isBusy}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-none">Event ledger</h2>
          <p className="text-xs text-muted-foreground">
            Live snapshot of ownership churn sourced from `public.ownership_events`.
          </p>
        </div>

        <div className="mt-6">
          {dataLoader.error ? (
            <ErrorDisplay
              error={dataLoader.error}
              title="Failed to load ownership events."
              onRetry={() => {
                void dataLoader.load()
              }}
            />
          ) : isBusy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {dataLoader.isRefreshing ? "Refreshing ownership events..." : "Loading ownership events..."}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredEvents}
              filterColumn="itemId"
              filterPlaceholder="Search events..."
              entityLabel="events"
              renderToolbar={(table) => {
                const itemColumn = table.getColumn("itemId")
                const searchValue =
                  (itemColumn?.getFilterValue() as string | undefined) ?? ""
                const isFiltered =
                  Boolean(searchValue.trim()) || actionFilter !== "all"

                const actionOptions = ACTION_OPTIONS.map(option => ({
                  value: option,
                  label: option === "all" ? "All actions" : ACTION_LABELS[option]
                }))

                return (
                  <DataTableToolbar
                    hasFilters={isFiltered}
                    onReset={() => {
                      table.resetColumnFilters()
                      table.setPageIndex(0)
                      setActionFilter("all")
                    }}
                  >
                    <DataTableSearch
                      column={itemColumn}
                      placeholder="Search events..."
                    />
                    <DataTableFilter
                      value={actionFilter}
                      onChange={(value) => {
                        setActionFilter(value as OwnershipAction | "all")
                        table.setPageIndex(0)
                      }}
                      options={actionOptions}
                      label="Action"
                    />
                    <DataTableRefresh
                      isRefreshing={dataLoader.isRefreshing}
                      onRefresh={() => {
                        void dataLoader.refresh()
                      }}
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

export default EventsPage
