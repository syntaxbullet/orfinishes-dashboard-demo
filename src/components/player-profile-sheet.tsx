import * as React from "react"
import { Clock3, Loader2, Sparkles, Star } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerStatusBadge } from "@/components/player-status-badge"
import { numberFormatter, dateFormatter, dateTimeFormatter } from "@/lib/formatters"
import { normalizeMinecraftUuid, createPlayerDisplayInfo } from "@/lib/player-utils"
import {
  fetchItemOwnershipSnapshots,
  type CosmeticRecord,
  type ItemOwnershipSnapshot,
  type PlayerRecord,
} from "@/utils/supabase"

type OwnedFinish = {
  snapshot: ItemOwnershipSnapshot
  cosmetic: CosmeticRecord | null
}

export type PlayerProfileSheetProps = {
  player: PlayerRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}


export function PlayerProfileSheet({
  player,
  open,
  onOpenChange,
}: PlayerProfileSheetProps) {
  const [ownedFinishes, setOwnedFinishes] = React.useState<OwnedFinish[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!player || !open) {
      return
    }

    let cancelled = false

    const loadInventory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const snapshots = await fetchItemOwnershipSnapshots()
        if (cancelled) {
          return
        }

        // Filter snapshots for this player
        const playerSnapshots = snapshots.filter(
          (snapshot) => snapshot.latest_to_player_id?.trim() === player.id
        )

        const sortedSnapshots = [...playerSnapshots].sort((left, right) => {
          const leftDate = left.latest_occurred_at ?? left.created_at
          const rightDate = right.latest_occurred_at ?? right.created_at

          const leftTimestamp = Date.parse(leftDate ?? "")
          const rightTimestamp = Date.parse(rightDate ?? "")

          return rightTimestamp - leftTimestamp
        })

        setOwnedFinishes(
          sortedSnapshots.map((snapshot) => ({
            snapshot,
            cosmetic: null, // We'll use snapshot.cosmetic_name directly
          })),
        )
      } catch (inventoryError) {
        if (cancelled) {
          return
        }

        setOwnedFinishes([])
        setError(
          inventoryError instanceof Error
            ? inventoryError.message
            : "Failed to load the latest finishes for this player.",
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInventory()

    return () => {
      cancelled = true
    }
  }, [player, open])


  const stats = React.useMemo(() => {
    if (!player) {
      return []
    }

    const totalOwned = ownedFinishes.length
    const uniqueFinishTypes = new Set(
      ownedFinishes
        .map(({ snapshot }) => snapshot.finish_type?.trim().toLowerCase() || null)
        .filter(Boolean),
    ).size
    const unboxedCount = ownedFinishes.filter(
      ({ snapshot }) => snapshot.first_unbox_occurred_at && snapshot.first_unbox_to_player_id === player.id,
    ).length
    const latestUnboxTimestamp = ownedFinishes.reduce<number | null>(
      (latest, { snapshot }) => {
        const timestamp = snapshot.first_unbox_occurred_at ? Date.parse(snapshot.first_unbox_occurred_at) : NaN
        if (Number.isNaN(timestamp)) {
          return latest
        }

        if (latest === null || timestamp > latest) {
          return timestamp
        }

        return latest
      },
      null,
    )
    const lastActivitySource =
      player.profile_synced_at ??
      player.avatar_synced_at ??
      player.updated_at ??
      player.created_at

    return [
      {
        label: "Owned finishes",
        value: numberFormatter.format(totalOwned),
        detail:
          uniqueFinishTypes > 0
            ? `${numberFormatter.format(uniqueFinishTypes)} unique finish${
                uniqueFinishTypes === 1 ? "" : "es"
              }`
            : "No unique finish types recorded",
        icon: Sparkles,
      },
      {
        label: "Unboxed items",
        value: numberFormatter.format(unboxedCount),
        detail:
          latestUnboxTimestamp !== null
            ? `Latest unbox ${dateFormatter.format(new Date(latestUnboxTimestamp))}`
            : "No unboxed items recorded",
        icon: Star,
      },
      {
        label: "Last sync",
        value: lastActivitySource
          ? dateTimeFormatter.format(new Date(lastActivitySource))
          : "—",
        detail: "Aggregated from profile and avatar sync events",
        icon: Clock3,
      },
    ]
  }, [ownedFinishes, player])

  const normalizedUuid = React.useMemo(
    () => (player ? normalizeMinecraftUuid(player.minecraft_uuid) : null),
    [player],
  )


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader className="gap-3 sm:gap-4 p-3 sm:p-4 pb-0">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              {player ? (
                <PlayerAvatar 
                  profile={createPlayerDisplayInfo(player, 112)} 
                  size="xl" 
                  className="rounded-lg h-16 w-16 sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted text-xl sm:text-2xl font-semibold uppercase text-muted-foreground">
                  ?
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 sm:gap-1.5 min-w-0">
              <SheetTitle className="text-lg sm:text-2xl font-semibold text-foreground truncate">
                {player?.display_name?.trim() || "Unknown player"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Minecraft UUID{" "}
                {normalizedUuid ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] break-all">
                    {normalizedUuid}
                  </code>
                ) : (
                  "Unavailable"
                )}
              </SheetDescription>
              <div>
                <PlayerStatusBadge isBanned={Boolean(player?.is_banned)} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="p-3 sm:p-4 pt-3">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <div
                  key={stat.label}
                  className="rounded-md border border-border/80 bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {stat.label}
                  </div>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <Separator className="mx-4" />

        <div className="p-3 sm:p-4 pt-3 overflow-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Owned finishes
          </h3>

          {isLoading ? (
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading owned finishes...
            </div>
          ) : error ? (
            <p className="mt-3 sm:mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : ownedFinishes.length ? (
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 overflow-y-auto pr-1">
              {ownedFinishes.map(({ snapshot, cosmetic }) => {
                const ownedSince =
                  snapshot.latest_occurred_at ?? snapshot.created_at ?? null
                const unboxedByPlayer =
                  player && snapshot.first_unbox_to_player_id === player.id && snapshot.first_unbox_occurred_at
                let ownedDisplay = "Unknown date"

                if (ownedSince) {
                  const timestamp = Date.parse(ownedSince)
                  if (!Number.isNaN(timestamp)) {
                    ownedDisplay = dateTimeFormatter.format(new Date(timestamp))
                  }
                }

                return (
                  <li
                    key={snapshot.item_id}
                    className="rounded-md border border-border/70 bg-card/70 p-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {snapshot.cosmetic_name?.trim() || snapshot.item_id}
                        </p>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {snapshot.finish_type?.trim() || "Unknown finish"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Owned since {ownedDisplay}
                      </p>
                      {unboxedByPlayer ? (
                        <p className="text-xs text-emerald-600">
                          Unboxed directly by this player
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              This player does not currently own any finishes.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
