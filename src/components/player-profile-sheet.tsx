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
import { normalizeMinecraftUuid, buildPlayerAvatarUrl, createPlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  fetchCosmeticsByIds,
  fetchItems,
  type CosmeticRecord,
  type ItemRecord,
  type PlayerRecord,
} from "@/utils/supabase"

type OwnedFinish = {
  item: ItemRecord
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
        const items = await fetchItems({ ownerId: player.id })
        if (cancelled) {
          return
        }

        const uniqueCosmeticIds = Array.from(
          new Set(
            items
              .map((item) => item.cosmetic?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        )

        let cosmetics: CosmeticRecord[] = []

        if (uniqueCosmeticIds.length) {
          cosmetics = await fetchCosmeticsByIds(uniqueCosmeticIds)
          if (cancelled) {
            return
          }
        }

        const cosmeticLookup = new Map(
          cosmetics.map((cosmetic) => [cosmetic.id, cosmetic]),
        )

        const sortedItems = [...items].sort((left, right) => {
          const leftDate = left.minted_at ?? left.updated_at ?? left.created_at
          const rightDate = right.minted_at ?? right.updated_at ?? right.created_at

          const leftTimestamp = Date.parse(leftDate ?? "")
          const rightTimestamp = Date.parse(rightDate ?? "")

          return rightTimestamp - leftTimestamp
        })

        setOwnedFinishes(
          sortedItems.map((item) => ({
            item,
            cosmetic: item.cosmetic
              ? cosmeticLookup.get(item.cosmetic.trim()) ?? null
              : null,
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
  }, [player?.id, open])

  const avatarUrl = React.useMemo(
    () => (player ? buildPlayerAvatarUrl(player, 112) : null),
    [player],
  )

  const stats = React.useMemo(() => {
    if (!player) {
      return []
    }

    const totalOwned = ownedFinishes.length
    const uniqueFinishTypes = new Set(
      ownedFinishes
        .map(({ item }) => item.finish_type?.trim().toLowerCase() || null)
        .filter(Boolean),
    ).size
    const mintedCount = ownedFinishes.filter(
      ({ item }) => item.minted_by && item.minted_by === player.id,
    ).length
    const latestMintTimestamp = ownedFinishes.reduce<number | null>(
      (latest, { item }) => {
        const timestamp = item.minted_at ? Date.parse(item.minted_at) : NaN
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
        value: numberFormatter.format(mintedCount),
        detail:
          latestMintTimestamp !== null
            ? `Latest unbox ${dateFormatter.format(new Date(latestMintTimestamp))}`
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
        <SheetHeader className="gap-4 p-4 pb-0">
          <div className="flex items-start gap-4">
            <div className="relative">
              {player ? (
                <PlayerAvatar 
                  profile={createPlayerDisplayInfo(player, 112)} 
                  size="xl" 
                  className="rounded-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted text-2xl font-semibold uppercase text-muted-foreground">
                  ?
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <SheetTitle className="text-2xl font-semibold text-foreground">
                {player?.display_name?.trim() || "Unknown player"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Minecraft UUID{" "}
                {normalizedUuid ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
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

        <div className="p-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
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

        <div className="p-4 pt-3 overflow-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Owned finishes
          </h3>

          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading owned finishes...
            </div>
          ) : error ? (
            <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : ownedFinishes.length ? (
            <ul className="mt-4 space-y-3 overflow-y-scroll pr-1">
              {ownedFinishes.map(({ item, cosmetic }) => {
                const ownedSince =
                  item.minted_at ?? item.updated_at ?? item.created_at ?? null
                const mintedByPlayer =
                  player && item.minted_by === player.id && item.minted_at
                let ownedDisplay = "Unknown date"

                if (ownedSince) {
                  const timestamp = Date.parse(ownedSince)
                  if (!Number.isNaN(timestamp)) {
                    ownedDisplay = dateTimeFormatter.format(new Date(timestamp))
                  }
                }

                return (
                  <li
                    key={item.id}
                    className="rounded-md border border-border/70 bg-card/70 p-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {cosmetic?.name?.trim() || item.id}
                        </p>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {item.finish_type?.trim() || "Unknown finish"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Owned since {ownedDisplay}
                      </p>
                      {mintedByPlayer ? (
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
