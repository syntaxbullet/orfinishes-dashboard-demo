import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { PlayerProfileSheet } from "@/components/player-profile-sheet"
import { ItemDetailSheet } from "@/components/item-detail-sheet"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCard } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { DataTableToolbar, DataTableSearch, DataTableFilter, DataTableRefresh } from "@/components/data-table-toolbar"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Button } from "@/components/ui/button"
import { usePlayerProfile } from "@/hooks/use-player-profile"
import { numberFormatter, dateFormatter } from "@/lib/formatters"
import { createPlayerDisplayInfo, createPlayerLookupMap, resolvePlayerByIdentifier, type PlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import { usePlayersStore } from "@/stores/players-store"
import { useCosmeticsStore } from "@/stores/cosmetics-store"
import { useItemsStore } from "@/stores/items-store"
import {
  deleteItem,
  type CosmeticRecord,
  type ItemRecord,
  type PlayerRecord,
} from "@/utils/supabase"


type ItemRow = {
  id: string
  itemId: string
  cosmeticName: string
  cosmeticType: string
  finishType: string
  currentOwner: PlayerDisplayInfo | null
  unboxedBy: PlayerDisplayInfo | null
  unboxedAt: string | null
  unboxedTimestamp: number
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
  onDeleteItem: (itemId: string, itemName: string) => void,
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
            <PlayerAvatar profile={owner}/>
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
      accessorKey: "unboxedBy",
      header: "Unboxed By",
      cell: ({ row }) => {
        const unboxer = row.original.unboxedBy
        if (!unboxer) {
          return <span className="text-sm text-muted-foreground">Unknown</span>
        }

        const handleClick = () => {
          const player = resolvePlayerByIdentifier(unboxer.id, playerLookup)
          if (player) {
            onPlayerClick(player)
          }
        }

        return (
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-2 rounded-md border border-transparent p-1 text-left transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`Open profile for ${unboxer.displayName}`}
          >
            <PlayerAvatar profile={unboxer} />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{unboxer.displayName}</p>
              <p className="text-xs text-muted-foreground">{unboxer.id}</p>
            </div>
          </button>
        )
      },
      sortingFn: (a, b) => {
        const aName = a.original.unboxedBy?.displayName ?? ""
        const bName = b.original.unboxedBy?.displayName ?? ""
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
      accessorKey: "unboxedAt",
      header: "Unboxed",
      cell: ({ row }) => {
        const unboxedAt = row.original.unboxedAt
        if (!unboxedAt) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        const date = new Date(unboxedAt)
        if (Number.isNaN(date.getTime())) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        return (
          <span className="text-sm text-muted-foreground">
            {dateFormatter.format(date)}
          </span>
        )
      },
      sortingFn: (a, b) => a.original.unboxedTimestamp - b.original.unboxedTimestamp,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const handleDelete = () => {
          const itemName = `${row.original.cosmeticName} (${row.original.finishType})`
          onDeleteItem(row.original.id, itemName)
        }

        return (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={`Delete item ${row.original.cosmeticName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]
}

export function ItemsPage() {
  const [ownershipFilter, setOwnershipFilter] = React.useState<string>("all")
  const [selectedItem, setSelectedItem] = React.useState<ItemRecord | null>(null)
  const [isItemSheetOpen, setIsItemSheetOpen] = React.useState(false)
  const [timeReference, setTimeReference] = React.useState(() => Date.now())
  
  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    itemId: string | null
    itemName: string
    isDeleting: boolean
  }>({
    open: false,
    itemId: null,
    itemName: "",
    isDeleting: false,
  })

  // Use stores for data management
  const playersStore = usePlayersStore()
  const cosmeticsStore = useCosmeticsStore()
  const itemsStore = useItemsStore()

  // Get data from stores
  const items = useItemsStore((state) => state.items)
  const players = usePlayersStore((state) => state.players)
  const cosmetics = useCosmeticsStore((state) => state.cosmetics)
  const totalCount = useItemsStore((state) => state.totalCount)

  // Get loading states
  const isLoading = playersStore.isLoading || cosmeticsStore.isLoading || itemsStore.isLoading
  const isRefreshing = playersStore.isRefreshing || cosmeticsStore.isRefreshing || itemsStore.isRefreshing
  const error = playersStore.error || cosmeticsStore.error || itemsStore.error
  
  // Use the player profile hook for modal management
  const playerProfile = usePlayerProfile(players)

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        playersStore.fetchPlayers({ includeBanned: true }),
        itemsStore.fetchItems(),
        cosmeticsStore.fetchCosmetics(),
      ])
    }
    void fetchData()
  }, [playersStore, itemsStore, cosmeticsStore])

  // Refresh function
  const handleRefresh = React.useCallback(async () => {
    await Promise.all([
      playersStore.refreshPlayers(),
      itemsStore.refreshItems(),
      cosmeticsStore.refreshCosmetics(),
    ])
  }, [playersStore, itemsStore, cosmeticsStore])

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

  const handleDeleteItem = React.useCallback(
    (itemId: string, itemName: string) => {
      setDeleteDialog({
        open: true,
        itemId,
        itemName,
        isDeleting: false,
      })
    },
    [],
  )

  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteDialog.itemId) { return; }

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }))

    try {
      await deleteItem(deleteDialog.itemId)
      setDeleteDialog({
        open: false,
        itemId: null,
        itemName: "",
        isDeleting: false,
      })
      // Refresh the data
      void handleRefresh()
    } catch (error) {
      console.error("Failed to delete item:", error)
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }))
      // You might want to show a toast notification here
    }
  }, [deleteDialog.itemId, handleRefresh])

  const handleCancelDelete = React.useCallback(() => {
    setDeleteDialog({
      open: false,
      itemId: null,
      itemName: "",
      isDeleting: false,
    })
  }, [])

  const columns = React.useMemo(
    () => createItemColumns(handlePlayerClick, handleItemClick, handleDeleteItem, items, playerLookup),
    [handlePlayerClick, handleItemClick, handleDeleteItem, items, playerLookup],
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
        ? createPlayerDisplayInfo(currentOwner)
        : null

      const unboxedBy = item.minted_by
        ? resolvePlayerByIdentifier(item.minted_by, playerLookup)
        : null
      const unboxedByProfile = unboxedBy
        ? createPlayerDisplayInfo(unboxedBy)
        : null

      const unboxedTimestamp = item.minted_at ? Date.parse(item.minted_at) : -Infinity
      const ownershipStatus = item.current_owner ? "Owned" : "Unassigned"

      const searchTokens = [
        item.id,
        cosmeticName,
        cosmeticType,
        item.finish_type || "",
        currentOwnerProfile?.displayName || "",
        unboxedByProfile?.displayName || "",
        ownershipStatus,
      ]

      return {
        id: item.id,
        itemId: item.id,
        cosmeticName,
        cosmeticType,
        finishType: item.finish_type || "Unknown",
        currentOwner: currentOwnerProfile,
        unboxedBy: unboxedByProfile,
        unboxedAt: item.minted_at,
        unboxedTimestamp: Number.isNaN(unboxedTimestamp) ? -Infinity : unboxedTimestamp,
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

  React.useEffect(() => {
    setTimeReference(Date.now())
  }, [tableData])

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
          label: "Recent unboxes",
          value: "0",
          detail: "No unboxing activity recorded.",
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
          label: "Recent unboxes",
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

    // Calculate recent unboxes (last 7 days)
    const sevenDaysAgo = timeReference - 7 * 24 * 60 * 60 * 1000
    const recentUnboxes = tableData.filter(
      (item) => item.unboxedTimestamp > sevenDaysAgo,
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
        label: "Recent unboxes",
        value: numberFormatter.format(recentUnboxes),
        detail: "Items unboxed in the last 7 days",
      },
      {
        label: "Unique finish types",
        value: numberFormatter.format(uniqueFinishTypes),
        detail: mostCommonFinish
          ? `Most common: ${mostCommonFinish[0]} (${numberFormatter.format(mostCommonFinish[1])})`
          : "No finish types recorded",
      },
    ]
  }, [tableData, timeReference, totalCount])

  return (
    <>
      <section className="space-y-4 sm:space-y-6 px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        <header className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Items
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Browse all unboxed items with their finish types and ownership status
            sourced from `public.items`.
          </p>
        </header>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              detail={card.detail}
              isLoading={isLoading}
            />
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-none">Item inventory</h2>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 
                  ? `Showing ${numberFormatter.format(tableData.length)} of ${numberFormatter.format(totalCount)} items`
                  : "Live snapshot of all unboxed items with their current ownership status."
                }
              </p>
            </div>

          <div className="mt-6">
            {error ? (
              <ErrorDisplay
                error={error}
                title="Failed to load items data."
                onRetry={handleRefresh}
              />
            ) : isLoading ? (
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
                        isRefreshing={isRefreshing}
                        onRefresh={handleRefresh}
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
      
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        description="Are you sure you want to delete this item? This will also delete all associated ownership events. This action cannot be undone."
        itemName={deleteDialog.itemName}
        isDeleting={deleteDialog.isDeleting}
      />
    </>
  )
}

export default ItemsPage
