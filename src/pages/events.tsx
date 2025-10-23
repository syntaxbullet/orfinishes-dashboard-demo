import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { numberFormatter, dateTimeFormatter } from "@/lib/formatters"
import { normalizeMinecraftUuid, buildPlayerAvatarUrl, createPlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  fetchCosmeticsByIds,
  fetchItemsByIds,
  fetchOwnershipEvents,
  fetchPlayers,
  type CosmeticRecord,
  type ItemRecord,
  type OwnershipAction,
  type OwnershipEventRecord,
  type PlayerRecord,
} from "@/utils/supabase"

const PARTICIPANT_AVATAR_SIZE = 40


type ParticipantProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
  fallbackInitial: string
}

type ItemMetadata = {
  name: string
  finishType: string | null
}

function buildParticipantProfile(player: PlayerRecord): ParticipantProfile {
  const playerDisplayInfo = createPlayerDisplayInfo(player, PARTICIPANT_AVATAR_SIZE)
  
  return {
    id: playerDisplayInfo.id,
    displayName: playerDisplayInfo.displayName,
    avatarUrl: playerDisplayInfo.avatarUrl,
    fallbackInitial: playerDisplayInfo.fallbackInitial,
  }
}

type OwnershipEventRow = {
  id: string
  action: OwnershipAction
  itemId: string
  itemName: string
  itemDetail: string
  fromPlayer: string | null
  toPlayer: string | null
  fromProfile: ParticipantProfile | null
  toProfile: ParticipantProfile | null
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
        return "Minted to"
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
  profile: ParticipantProfile
}) {
  const playerDisplayInfo = {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    fallbackInitial: profile.fallbackInitial,
    minecraftUuid: "", // Not needed for this component
  }

  return <PlayerAvatar profile={playerDisplayInfo} size="sm" className="rounded-full" />
}

function ParticipantPreview({
  profile,
  label,
  onSelect,
}: {
  profile: ParticipantProfile
  label?: string
  onSelect?: (profile: ParticipantProfile) => void
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
  onParticipantClick: (profile: ParticipantProfile) => void,
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
  const [events, setEvents] = React.useState<OwnershipEventRecord[]>([])
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [items, setItems] = React.useState<ItemRecord[]>([])
  const [cosmetics, setCosmetics] = React.useState<CosmeticRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [actionFilter, setActionFilter] = React.useState<
    OwnershipAction | "all"
  >("all")
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)

  const loadEvents = React.useCallback(
    async (options?: {
      soft?: boolean
      includeContext?: boolean
      forceRefresh?: boolean
    }) => {
      const includeContext = options?.includeContext ?? false
      const shouldForceRefresh =
        options?.forceRefresh ?? options?.soft ?? false

      if (options?.soft) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        const eventsData = await fetchOwnershipEvents({
          forceRefresh: shouldForceRefresh,
        })

        let playersData: PlayerRecord[] | null = null
        let itemsData: ItemRecord[] | null = null
        let cosmeticsData: CosmeticRecord[] | null = null

        if (includeContext) {
          const uniqueItemIds = Array.from(
            new Set(
              eventsData
                .map((event) => (event.item_id ? event.item_id.trim() : ""))
                .filter((value) => value.length > 0),
            ),
          )

          const [playersResult, itemsResult] = await Promise.allSettled([
            fetchPlayers({
              includeBanned: true,
              forceRefresh: shouldForceRefresh,
            }),
            uniqueItemIds.length
              ? fetchItemsByIds(uniqueItemIds, {
                  forceRefresh: shouldForceRefresh,
                })
              : Promise.resolve([] as ItemRecord[]),
          ])

          if (playersResult.status === "fulfilled") {
            playersData = playersResult.value
          } else if (playersResult.status === "rejected") {
            console.error(
              "Failed to load players for ownership events table",
              playersResult.reason,
            )
          }

          if (itemsResult.status === "fulfilled") {
            itemsData = itemsResult.value
          } else if (itemsResult.status === "rejected") {
            console.error(
              "Failed to load items for ownership events table",
              itemsResult.reason,
            )

            if (uniqueItemIds.length === 0) {
              itemsData = []
            }
          }

          if (itemsData && itemsData.length) {
            const uniqueCosmeticIds = Array.from(
              new Set(
                itemsData
                  .map((item) => (item.cosmetic ? item.cosmetic.trim() : ""))
                  .filter((value) => value.length > 0),
              ),
            )

            if (uniqueCosmeticIds.length) {
              try {
                cosmeticsData = await fetchCosmeticsByIds(uniqueCosmeticIds, {
                  forceRefresh: shouldForceRefresh,
                })
              } catch (cosmeticError) {
                console.error(
                  "Failed to load cosmetics for ownership events table",
                  cosmeticError,
                )
                cosmeticsData = null
              }
            } else {
              cosmeticsData = []
            }
          } else if (itemsData) {
            cosmeticsData = []
          }
        }

        if (playersData !== null) {
          setPlayers(playersData)
        }

        if (itemsData !== null) {
          setItems(itemsData)
        }

        if (cosmeticsData !== null) {
          setCosmetics(cosmeticsData)
        }

        setEvents(eventsData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load ownership events from Supabase.",
        )
      } finally {
        if (options?.soft) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  React.useEffect(() => {
    void loadEvents({ includeContext: true })
  }, [loadEvents])

  const playerLookup = React.useMemo(() => {
    const lookup = new Map<string, ParticipantProfile>()

    for (const player of players) {
      const profile = buildParticipantProfile(player)
      lookup.set(player.id, profile)

      const displayName = player.display_name?.trim().toLowerCase()
      if (displayName) {
        lookup.set(displayName, profile)
      }

      const normalizedUuid = normalizeMinecraftUuid(player.minecraft_uuid)
      if (normalizedUuid) {
        lookup.set(normalizedUuid, profile)
      }
    }

    return lookup
  }, [players])

  const playerRecordLookup = React.useMemo(() => {
    const lookup = new Map<string, PlayerRecord>()

    for (const player of players) {
      lookup.set(player.id, player)

      const displayName = player.display_name?.trim().toLowerCase()
      if (displayName) {
        lookup.set(displayName, player)
      }

      const normalizedUuid = normalizeMinecraftUuid(player.minecraft_uuid)
      if (normalizedUuid) {
        lookup.set(normalizedUuid, player)
      }
    }

    return lookup
  }, [players])

  const handleParticipantClick = React.useCallback(
    (profile: ParticipantProfile) => {
      const candidates = new Set<string>()
      const trimmedId = profile.id.trim()
      if (trimmedId) {
        candidates.add(trimmedId)
      }

      const displayName = profile.displayName.trim().toLowerCase()
      if (displayName) {
        candidates.add(displayName)
      }

      const normalizedUuid = normalizeMinecraftUuid(profile.id)
      if (normalizedUuid) {
        candidates.add(normalizedUuid)
      }

      let resolved: PlayerRecord | undefined

      for (const candidate of candidates) {
        const match = playerRecordLookup.get(candidate)
        if (match) {
          resolved = match
          break
        }
      }

      if (!resolved) {
        return
      }

      setSelectedPlayerId(resolved.id)
      setIsProfileOpen(true)
    },
    [playerRecordLookup, setIsProfileOpen, setSelectedPlayerId],
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
    const fallbackProfile = (identifier: string): ParticipantProfile => {
      const trimmed = identifier.trim()
      const initial = trimmed.charAt(0).toUpperCase() || "?"

      return {
        id: trimmed,
        displayName: trimmed,
        avatarUrl: null,
        fallbackInitial: initial,
      }
    }

    const resolveParticipant = (identifier: string | null): ParticipantProfile | null => {
      if (!identifier) {
        return null
      }

      const trimmed = identifier.trim()
      if (!trimmed) {
        return null
      }

      const normalizedUuid = normalizeMinecraftUuid(trimmed)

      return (
        playerLookup.get(trimmed) ??
        playerLookup.get(trimmed.toLowerCase()) ??
        (normalizedUuid ? playerLookup.get(normalizedUuid) : undefined) ??
        fallbackProfile(trimmed)
      )
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

  const selectedPlayer = React.useMemo(
    () =>
      selectedPlayerId
        ? playerRecordLookup.get(selectedPlayerId) ?? null
        : null,
    [playerRecordLookup, selectedPlayerId],
  )

  const isProfileSheetOpen = Boolean(selectedPlayer) && isProfileOpen

  const filteredEvents = React.useMemo(() => {
    if (actionFilter === "all") {
      return tableData
    }

    return tableData.filter((event) => event.action === actionFilter)
  }, [actionFilter, tableData])

  const isBusy = isLoading || isRefreshing

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
      <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Ownership Events
        </h1>
        <p className="text-sm text-muted-foreground">
          Review the event ledger for grants, transfers, unboxes, and revokes
          sourced from `public.ownership_events`.
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
            {isBusy ? (
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {card.value}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {isBusy ? (
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
          <h2 className="text-lg font-semibold leading-none">Event ledger</h2>
          <p className="text-xs text-muted-foreground">
            Live snapshot of ownership churn sourced from `public.ownership_events`.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm font-medium text-destructive">
                Failed to load ownership events.
              </p>
              <p className="text-xs text-destructive">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  loadEvents({ includeContext: true, forceRefresh: true })
                }
              >
                Retry
              </Button>
            </div>
          ) : isBusy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRefreshing ? "Refreshing ownership events..." : "Loading ownership events..."}
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

                return (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        value={searchValue}
                        onChange={(event) =>
                          itemColumn?.setFilterValue(event.target.value)
                        }
                        placeholder="Search events..."
                        className="w-full sm:max-w-xs"
                      />

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Action
                        </span>
                        <select
                          value={actionFilter}
                          onChange={(event) => {
                            const value = event.target.value as OwnershipAction | "all"
                            setActionFilter(value)
                            table.setPageIndex(0)
                          }}
                          className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {ACTION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option === "all"
                                ? "All actions"
                                : ACTION_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void loadEvents({
                            soft: true,
                            includeContext: true,
                          })
                        }}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Refreshing
                          </>
                        ) : (
                          "Refresh"
                        )}
                      </Button>

                      {isFiltered ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            table.resetColumnFilters()
                            table.setPageIndex(0)
                            setActionFilter("all")
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

export default EventsPage
