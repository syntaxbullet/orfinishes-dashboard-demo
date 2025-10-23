import * as React from "react"
import { Clock3, Loader2, Package, Star, User } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { Button } from "@/components/ui/button"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, dateFormatter, dateTimeFormatter } from "@/lib/formatters"
import { normalizeMinecraftUuid, buildPlayerAvatarUrl, createPlayerDisplayInfo, createPlayerLookupMap, resolvePlayerByIdentifier, createFallbackPlayerDisplayInfo, type PlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  fetchOwnershipEventsForItem,
  fetchPlayers,
  fetchCosmeticById,
  type ItemRecord,
  type OwnershipEventRecord,
  type PlayerRecord,
  type CosmeticRecord,
} from "@/utils/supabase"

type OwnershipEventWithProfiles = {
  event: OwnershipEventRecord
  fromProfile: PlayerDisplayInfo | null
  toProfile: PlayerDisplayInfo | null
}

export type ItemDetailSheetProps = {
  item: ItemRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTION_LABELS: Record<string, string> = {
  grant: "Grant",
  transfer: "Transfer",
  unbox: "Unbox",
  revoke: "Revoke",
}

const ACTION_STYLES: Record<string, string> = {
  grant: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  transfer: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  unbox: "border-violet-500/40 bg-violet-500/10 text-violet-600",
  revoke: "border-destructive/40 bg-destructive/10 text-destructive",
}

export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
}: ItemDetailSheetProps) {
  const [ownershipEvents, setOwnershipEvents] = React.useState<OwnershipEventWithProfiles[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [cosmetic, setCosmetic] = React.useState<CosmeticRecord | null>(null)

  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  React.useEffect(() => {
    if (!item || !open) {
      return
    }

    let cancelled = false

    const loadItemDetails = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Load players first for profile resolution
        const playersData = await fetchPlayers({ includeBanned: true })
        if (cancelled) {
          return
        }
        setPlayers(playersData)

        // Load cosmetic data if item has a cosmetic ID
        if (item.cosmetic) {
          const cosmeticData = await fetchCosmeticById(item.cosmetic)
          if (cancelled) {
            return
          }
          setCosmetic(cosmeticData)
        }

        // Load ownership events for this item
        const events = await fetchOwnershipEventsForItem(item.id)
        if (cancelled) {
          return
        }

        // Create player lookup map
        const playerLookup = createPlayerLookupMap(playersData)

        // Resolve player profiles for each event
        const eventsWithProfiles: OwnershipEventWithProfiles[] = events.map((event) => {
          const fromPlayer = event.from_player
            ? resolvePlayerByIdentifier(event.from_player, playerLookup)
            : null
          const toPlayer = event.to_player
            ? resolvePlayerByIdentifier(event.to_player, playerLookup)
            : null

          const fromProfile = fromPlayer
            ? createPlayerDisplayInfo(fromPlayer, 40)
            : event.from_player
              ? createFallbackPlayerDisplayInfo(event.from_player, 40)
              : null

          const toProfile = toPlayer
            ? createPlayerDisplayInfo(toPlayer, 40)
            : event.to_player
              ? createFallbackPlayerDisplayInfo(event.to_player, 40)
              : null

          return {
            event,
            fromProfile,
            toProfile,
          }
        })

        if (!cancelled) {
          setOwnershipEvents(eventsWithProfiles)
        }
      } catch (itemError) {
        if (cancelled) {
          return
        }

        setOwnershipEvents([])
        setError(
          itemError instanceof Error
            ? itemError.message
            : "Failed to load item details.",
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadItemDetails()

    return () => {
      cancelled = true
    }
  }, [item?.id, open])

  const handlePlayerClick = React.useCallback(
    (player: PlayerRecord) => {
      playerProfile.openProfile(player)
    },
    [playerProfile],
  )

  const stats = React.useMemo(() => {
    if (!item) {
      return []
    }

    const totalEvents = ownershipEvents.length
    const unboxEvents = ownershipEvents.filter(
      (entry) => entry.event.action === "unbox",
    ).length
    const transferEvents = ownershipEvents.filter(
      (entry) => entry.event.action === "transfer",
    ).length
    const latestEvent = ownershipEvents[0] // Events are sorted by date desc

    return [
      {
        label: "Total events",
        value: numberFormatter.format(totalEvents),
        detail: `Unbox ${numberFormatter.format(unboxEvents)} · Transfer ${numberFormatter.format(transferEvents)}`,
        icon: Package,
      },
      {
        label: "Latest activity",
        value: latestEvent
          ? dateTimeFormatter.format(new Date(latestEvent.event.occurred_at))
          : "—",
        detail: latestEvent
          ? `${ACTION_LABELS[latestEvent.event.action]} event`
          : "No activity recorded",
        icon: Clock3,
      },
      {
        label: "Current status",
        value: item.current_owner ? "Owned" : "Unassigned",
        detail: item.current_owner
          ? "Item has an assigned owner"
          : "Item is not currently assigned",
        icon: Star,
      },
    ]
  }, [item, ownershipEvents])

  const currentOwner = React.useMemo(() => {
    if (!item?.current_owner) {
      return null
    }

    const player = resolvePlayerByIdentifier(item.current_owner, createPlayerLookupMap(players))
    return player ? createPlayerDisplayInfo(player, 40) : null
  }, [item?.current_owner, players])

  const mintedBy = React.useMemo(() => {
    if (!item?.minted_by) {
      return null
    }

    const player = resolvePlayerByIdentifier(item.minted_by, createPlayerLookupMap(players))
    return player ? createPlayerDisplayInfo(player, 40) : null
  }, [item?.minted_by, players])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader className="gap-4 p-4 pb-0">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                <SheetTitle className="text-2xl font-semibold text-foreground">
                  {cosmetic?.name || "Unknown Item"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Finish Type{" "}
                  <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {item?.finish_type || "Unknown"}
                  </span>
                </SheetDescription>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      item?.current_owner
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-muted-foreground/40 bg-muted/10 text-muted-foreground",
                    )}
                  >
                    {item?.current_owner ? "Owned" : "Unassigned"}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="p-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => {
                const Icon = stat.icon

                return (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.detail}
                    </p>
                  </div>
                )
              })}
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Current Owner</h3>
                {currentOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      const player = resolvePlayerByIdentifier(currentOwner.id, createPlayerLookupMap(players))
                      if (player) {
                        handlePlayerClick(player)
                      }
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    aria-label={`Open profile for ${currentOwner.displayName}`}
                  >
                    <PlayerAvatar profile={currentOwner} size="md" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{currentOwner.displayName}</p>
                      <p className="text-xs text-muted-foreground">{currentOwner.id}</p>
                    </div>
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No current owner</p>
                )}
              </div>

              {mintedBy && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Minted By</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const player = resolvePlayerByIdentifier(mintedBy.id, createPlayerLookupMap(players))
                      if (player) {
                        handlePlayerClick(player)
                      }
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    aria-label={`Open profile for ${mintedBy.displayName}`}
                  >
                    <PlayerAvatar profile={mintedBy} size="md" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{mintedBy.displayName}</p>
                      <p className="text-xs text-muted-foreground">{mintedBy.id}</p>
                    </div>
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-foreground">Ownership History</h3>
                {isLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading history...
                  </div>
                ) : error ? (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                ) : ownershipEvents.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No ownership events recorded</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {ownershipEvents.map((entry, index) => {
                      const { event, fromProfile, toProfile } = entry
                      const isLatest = index === 0

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "rounded-lg border p-3",
                            isLatest
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/60 bg-muted/30",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                ACTION_STYLES[event.action] || "border-muted-foreground/40 bg-muted/10 text-muted-foreground",
                              )}
                            >
                              {ACTION_LABELS[event.action] || event.action}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dateTimeFormatter.format(new Date(event.occurred_at))}
                            </span>
                          </div>

                          <div className="mt-2 space-y-2">
                            {fromProfile && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">From:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const player = resolvePlayerByIdentifier(fromProfile.id, createPlayerLookupMap(players))
                                    if (player) {
                                      handlePlayerClick(player)
                                    }
                                  }}
                                  className="flex items-center gap-2 rounded border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40"
                                >
                                  <PlayerAvatar profile={fromProfile} size="sm" />
                                  <span className="text-xs font-medium">{fromProfile.displayName}</span>
                                </button>
                              </div>
                            )}

                            {toProfile && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">To:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const player = resolvePlayerByIdentifier(toProfile.id, createPlayerLookupMap(players))
                                    if (player) {
                                      handlePlayerClick(player)
                                    }
                                  }}
                                  className="flex items-center gap-2 rounded border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40"
                                >
                                  <PlayerAvatar profile={toProfile} size="sm" />
                                  <span className="text-xs font-medium">{toProfile.displayName}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PlayerProfileSheet
        player={playerProfile.selectedPlayer}
        open={playerProfile.isProfileOpen}
        onOpenChange={playerProfile.handleOpenChange}
      />
    </>
  )
}
