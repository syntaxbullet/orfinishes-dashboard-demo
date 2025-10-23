import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Boxes } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { ItemDetailSheet } from "@/components/item-detail-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCard } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { DataTableToolbar, DataTableSearch, DataTableFilter, DataTableRefresh } from "@/components/data-table-toolbar"
import { useDataLoader } from "@/hooks/use-data-loader"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, dateFormatter } from "@/lib/formatters"
import { createPlayerDisplayInfo, createPlayerLookupMap, resolvePlayerByIdentifier, type PlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  fetchItems,
  fetchItemsCount,
  fetchCosmeticsByIds,
  fetchPlayers,
  type CosmeticRecord,
  type ItemRecord,
  type PlayerRecord,
} from "@/utils/supabase"

const ITEM_AVATAR_SIZE = 40

type ItemRow = {
  id: string
  itemId: string
  cosmeticName: string
  cosmeticType: string
  finishType: string
  currentOwner: PlayerDisplayInfo | null
  mintedBy: PlayerDisplayInfo | null
  mintedAt: string | null
  mintedTimestamp: number
  ownershipStatus: "Owned" | "Unassigned"
  createdAt: string
  searchableText: string
}

const OWNERSHIP_STATUS_OPTIONS = [
  { value: "all", label: "All items" },
  { value: "Owned", label: "Owned" },
  { value: "Unassigned", label: "Unassigned" },
]

function createItemColumns(
  onPlayerClick: (player: PlayerRecord) => void,
  onItemClick: (item: ItemRecord) => void,
  items: ItemRecord[],
  playerLookup: Map<string, PlayerRecord>,
): ColumnDef<ItemRow>[] {
  return [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => {
        const handleClick = () => {
          const item = items.find(i => i.id === row.original.id)
          if (item) {
            onItemClick(item)
          }
        }

        return (
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full flex-col items-start rounded-md border border-transparent p-1.5 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Open details for item ${row.original.itemId}`}
          >
            <p className="font-medium text-foreground">{row.original.cosmeticName}</p>
            <p className="text-xs text-muted-foreground">{row.original.itemId}</p>
          </button>
        )
      },
      filterFn: (row, _columnId, value) => {
        const search = String(value ?? "").trim().toLowerCase()
        if (!search) {
          return true
        }
        return row.original.searchableText.includes(search)
      },
      sortingFn: (a, b) => a.original.itemId.localeCompare(b.original.itemId),
    },
    {
      accessorKey: "finishType",
      header: "Finish Type",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {row.original.finishType}
        </span>
      ),
      sortingFn: (a, b) => a.original.finishType.localeCompare(b.original.finishType),
    },
    {
      accessorKey: "currentOwner",
      header: "Current Owner",
      cell: ({ row }) => {
        const owner = row.original.currentOwner
        if (!owner) {
          return <span className="text-sm text-muted-foreground">Unassigned</span>
        }

        const handleClick = () => {
          // Find the player record from the lookup
          const player = resolvePlayerByIdentifier(owner.id, playerLookup)
          if (player) {
            onPlayerClick(player)
          }
        }

        return (
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-2 rounded-md border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Open profile for ${owner.displayName}`}
          >
            <PlayerAvatar profile={owner} size="sm" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{owner.displayName}</p>
              <p className="text-xs text-muted-foreground">{owner.id}</p>
            </div>
          </button>
        )
      },
      sortingFn: (a, b) => {
        const aName = a.original.currentOwner?.displayName ?? ""
        const bName = b.original.currentOwner?.displayName ?? ""
        return aName.localeCompare(bName)
      },
    },
    {
      accessorKey: "mintedBy",
      header: "Minted By",
      cell: ({ row }) => {
        const minter = row.original.mintedBy
        if (!minter) {
          return <span className="text-sm text-muted-foreground">Unknown</span>
        }

        const handleClick = () => {
          const player = resolvePlayerByIdentifier(minter.id, playerLookup)
          if (player) {
            onPlayerClick(player)
          }
        }

        return (
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-2 rounded-md border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Open profile for ${minter.displayName}`}
          >
            <PlayerAvatar profile={minter} size="sm" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{minter.displayName}</p>
              <p className="text-xs text-muted-foreground">{minter.id}</p>
            </div>
          </button>
        )
      },
      sortingFn: (a, b) => {
        const aName = a.original.mintedBy?.displayName ?? ""
        const bName = b.original.mintedBy?.displayName ?? ""
        return aName.localeCompare(bName)
      },
    },
    {
      accessorKey: "ownershipStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.ownershipStatus
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              status === "Owned"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-muted-foreground/40 bg-muted/10 text-muted-foreground",
            )}
          >
            {status}
          </span>
        )
      },
      sortingFn: (a, b) => a.original.ownershipStatus.localeCompare(b.original.ownershipStatus),
    },
    {
      accessorKey: "mintedAt",
      header: "Minted",
      cell: ({ row }) => {
        const mintedAt = row.original.mintedAt
        if (!mintedAt) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        const date = new Date(mintedAt)
        if (Number.isNaN(date.getTime())) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        return (
          <span className="text-sm text-muted-foreground">
            {dateFormatter.format(date)}
          </span>
        )
      },
      sortingFn: (a, b) => a.original.mintedTimestamp - b.original.mintedTimestamp,
    },
  ]
}

export function ItemsPage() {
  const [ownershipFilter, setOwnershipFilter] = React.useState<string>("all")
  const [selectedItem, setSelectedItem] = React.useState<ItemRecord | null>(null)
  const [isItemSheetOpen, setIsItemSheetOpen] = React.useState(false)

  // Use the data loader hook for managing loading states
  const dataLoader = useDataLoader(async () => {
    const [itemsData, playersData, totalCount] = await Promise.all([
      fetchItems(),
      fetchPlayers({ includeBanned: true }),
      fetchItemsCount(),
    ])

    // Get unique cosmetic IDs from items
    const uniqueCosmeticIds = Array.from(
      new Set(
        itemsData
          .map((item) => item.cosmetic?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    )

    let cosmetics: CosmeticRecord[] = []
    if (uniqueCosmeticIds.length) {
      cosmetics = await fetchCosmeticsByIds(uniqueCosmeticIds)
    }

    return { items: itemsData, players: playersData, cosmetics, totalCount }
  })

  const { items, players, cosmetics, totalCount } = dataLoader.data || { items: [], players: [], cosmetics: [], totalCount: 0 }
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  // Create player lookup map
  const playerLookup = React.useMemo(() => createPlayerLookupMap(players), [players])

  // Create cosmetic lookup map
  const cosmeticLookup = React.useMemo(() => {
    const lookup = new Map<string, CosmeticRecord>()
    for (const cosmetic of cosmetics) {
      lookup.set(cosmetic.id, cosmetic)
    }
    return lookup
  }, [cosmetics])

  const handlePlayerClick = React.useCallback(
    (player: PlayerRecord) => {
      playerProfile.openProfile(player)
    },
    [playerProfile],
  )

  const handleItemClick = React.useCallback(
    (item: ItemRecord) => {
      setSelectedItem(item)
      setIsItemSheetOpen(true)
    },
    [],
  )

  const handleItemSheetChange = React.useCallback(
    (open: boolean) => {
      setIsItemSheetOpen(open)
      if (!open) {
        setSelectedItem(null)
      }
    },
    [],
  )

  const columns = React.useMemo(
    () => createItemColumns(handlePlayerClick, handleItemClick, items, playerLookup),
    [handlePlayerClick, handleItemClick, items, playerLookup],
  )

  const tableData = React.useMemo<ItemRow[]>(() => {
    return items.map((item) => {
      const cosmetic = item.cosmetic ? cosmeticLookup.get(item.cosmetic.trim()) : null
      const cosmeticName = cosmetic?.name || "Unknown Cosmetic"
      const cosmeticType = cosmetic?.type || "Unknown"
      
      const currentOwner = item.current_owner
        ? resolvePlayerByIdentifier(item.current_owner, playerLookup)
        : null
      const currentOwnerProfile = currentOwner
        ? createPlayerDisplayInfo(currentOwner, ITEM_AVATAR_SIZE)
        : null

      const mintedBy = item.minted_by
        ? resolvePlayerByIdentifier(item.minted_by, playerLookup)
        : null
      const mintedByProfile = mintedBy
        ? createPlayerDisplayInfo(mintedBy, ITEM_AVATAR_SIZE)
        : null

      const mintedTimestamp = item.minted_at ? Date.parse(item.minted_at) : -Infinity
      const ownershipStatus = item.current_owner ? "Owned" : "Unassigned"

      const searchTokens = [
        item.id,
        cosmeticName,
        cosmeticType,
        item.finish_type || "",
        currentOwnerProfile?.displayName || "",
        mintedByProfile?.displayName || "",
        ownershipStatus,
      ]

      return {
        id: item.id,
        itemId: item.id,
        cosmeticName,
        cosmeticType,
        finishType: item.finish_type || "Unknown",
        currentOwner: currentOwnerProfile,
        mintedBy: mintedByProfile,
        mintedAt: item.minted_at,
        mintedTimestamp: Number.isNaN(mintedTimestamp) ? -Infinity : mintedTimestamp,
        ownershipStatus,
        createdAt: item.created_at,
        searchableText: searchTokens
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      }
    })
  }, [items, cosmeticLookup, playerLookup])

  const filteredItems = React.useMemo(() => {
    if (ownershipFilter === "all") {
      return tableData
    }
    return tableData.filter((item) => item.ownershipStatus === ownershipFilter)
  }, [ownershipFilter, tableData])

  const statCards = React.useMemo(() => {
    if (!tableData.length && totalCount === 0) {
      return [
        {
          label: "Total items",
          value: "0",
          detail: "No items found in database.",
        },
        {
          label: "Ownership coverage",
          value: "—",
          detail: "No items to analyze.",
        },
        {
          label: "Recent mints",
          value: "0",
          detail: "No minting activity recorded.",
        },
        {
          label: "Unique finish types",
          value: "0",
          detail: "No finish types recorded.",
        },
      ]
    }

    // If we have a total count but limited data, show loading state
    if (totalCount > 0 && tableData.length < totalCount) {
      return [
        {
          label: "Total items",
          value: "Loading...",
          detail: `Found ${numberFormatter.format(totalCount)} items, loading data...`,
        },
        {
          label: "Ownership coverage",
          value: "—",
          detail: "Calculating coverage...",
        },
        {
          label: "Recent mints",
          value: "—",
          detail: "Analyzing activity...",
        },
        {
          label: "Unique finish types",
          value: "—",
          detail: "Processing finish types...",
        },
      ]
    }

    const totalItems = tableData.length
    const ownedItems = tableData.filter((item) => item.ownershipStatus === "Owned").length
    const unassignedItems = totalItems - ownedItems
    const ownershipCoverage = totalItems > 0 ? ownedItems / totalItems : 0

    // Calculate recent mints (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentMints = tableData.filter(
      (item) => item.mintedTimestamp > sevenDaysAgo,
    ).length

    // Calculate unique finish types
    const uniqueFinishTypes = new Set(
      tableData.map((item) => item.finishType.toLowerCase()),
    ).size

    // Find most common finish type
    const finishTypeCounts = new Map<string, number>()
    for (const item of tableData) {
      const type = item.finishType.toLowerCase()
      finishTypeCounts.set(type, (finishTypeCounts.get(type) || 0) + 1)
    }
    const mostCommonFinish = Array.from(finishTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    return [
      {
        label: "Total items",
        value: numberFormatter.format(totalItems),
        detail: `Owned ${numberFormatter.format(ownedItems)} · Unassigned ${numberFormatter.format(unassignedItems)}`,
      },
      {
        label: "Ownership coverage",
        value: `${Math.round(ownershipCoverage * 100)}%`,
        detail: `${numberFormatter.format(ownedItems)} of ${numberFormatter.format(totalItems)} items assigned`,
      },
      {
        label: "Recent mints",
        value: numberFormatter.format(recentMints),
        detail: "Items minted in the last 7 days",
      },
      {
        label: "Unique finish types",
        value: numberFormatter.format(uniqueFinishTypes),
        detail: mostCommonFinish
          ? `Most common: ${mostCommonFinish[0]} (${numberFormatter.format(mostCommonFinish[1])})`
          : "No finish types recorded",
      },
    ]
  }, [tableData])

  return (
    <>
      <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Items
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse all minted items with their finish types and ownership status
            sourced from `public.items`.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <h2 className="text-lg font-semibold leading-none">Item inventory</h2>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 
                  ? `Showing ${numberFormatter.format(tableData.length)} of ${numberFormatter.format(totalCount)} items`
                  : "Live snapshot of all minted items with their current ownership status."
                }
              </p>
            </div>

          <div className="mt-6">
            {dataLoader.error ? (
              <ErrorDisplay
                error={dataLoader.error}
                title="Failed to load items data."
                onRetry={() => {
                  void dataLoader.load()
                }}
              />
            ) : dataLoader.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items...
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredItems}
                filterColumn="itemId"
                filterPlaceholder="Search items..."
                entityLabel="items"
                renderToolbar={(table) => {
                  const itemColumn = table.getColumn("itemId")
                  const searchValue =
                    (itemColumn?.getFilterValue() as string | undefined) ?? ""
                  const isFiltered =
                    Boolean(searchValue.trim()) || ownershipFilter !== "all"

                  return (
                    <DataTableToolbar
                      hasFilters={isFiltered}
                      onReset={() => {
                        table.resetColumnFilters()
                        table.setPageIndex(0)
                        setOwnershipFilter("all")
                      }}
                    >
                      <DataTableSearch
                        column={itemColumn}
                        placeholder="Search items..."
                      />
                      <DataTableFilter
                        value={ownershipFilter}
                        onChange={(value) => {
                          setOwnershipFilter(value)
                          table.setPageIndex(0)
                        }}
                        options={OWNERSHIP_STATUS_OPTIONS}
                        label="Status"
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
      <ItemDetailSheet
        item={selectedItem}
        open={isItemSheetOpen}
        onOpenChange={handleItemSheetChange}
      />
    </>
  )
}

export default ItemsPage
