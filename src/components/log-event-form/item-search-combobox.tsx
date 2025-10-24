import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createPlayerLookupMap, resolvePlayerByIdentifier } from "@/lib/player-utils"
import { formatItemForDisplay } from "@/lib/event-utils"
import {
  fetchCosmeticsByIds,
  fetchItems,
  fetchItemsByIds,
  fetchPlayers,
  type CosmeticRecord,
  type ItemRecord,
  type PlayerRecord,
} from "@/utils/supabase"

interface ItemSearchComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onSelectionChange?: (item: ItemWithMetadata | null) => void
}

export type ItemWithMetadata = {
  item: ItemRecord
  cosmetic: CosmeticRecord | null
  owner: PlayerRecord | null
}

const ITEM_FETCH_LIMIT = 250

async function hydrateItemsWithMetadata(items: ItemRecord[]): Promise<ItemWithMetadata[]> {
  if (items.length === 0) {
    return []
  }

  const cosmeticIds = new Set<string>()

  for (const item of items) {
    const cosmeticId = item.cosmetic?.trim()
    if (cosmeticId) {
      cosmeticIds.add(cosmeticId)
    }
  }

  const [cosmetics, players] = await Promise.all([
    cosmeticIds.size ? fetchCosmeticsByIds(Array.from(cosmeticIds)) : Promise.resolve([]),
    fetchPlayers({ includeBanned: true }),
  ])

  const cosmeticLookup = new Map(cosmetics.map((cosmetic) => [cosmetic.id, cosmetic]))
  const playerLookup = createPlayerLookupMap(players)

  return items.map((item) => {
    const cosmetic = item.cosmetic ? cosmeticLookup.get(item.cosmetic.trim()) ?? null : null
    const owner = item.current_owner ? resolvePlayerByIdentifier(item.current_owner, playerLookup) ?? null : null

    return {
      item,
      cosmetic,
      owner,
    }
  })
}

export function ItemSearchCombobox({
  value,
  onValueChange,
  placeholder = "Search items...",
  disabled = false,
  onSelectionChange,
}: ItemSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<ItemWithMetadata[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)
  const [fallbackItem, setFallbackItem] = React.useState<ItemWithMetadata | null>(null)
  const [isFetchingSelection, setIsFetchingSelection] = React.useState(false)

  const selectedFromList = React.useMemo(() => {
    if (!value) {
      return null
    }
    return items.find((candidate) => candidate.item.id === value) ?? null
  }, [items, value])

  const resolvedSelectedItem = selectedFromList ?? fallbackItem

  const handleLoad = React.useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const fetchedItems = await fetchItems({ limit: ITEM_FETCH_LIMIT })
      const hydrated = await hydrateItemsWithMetadata(fetchedItems)
      setItems(hydrated)
      setIsTruncated(fetchedItems.length >= ITEM_FETCH_LIMIT)
    } catch (error) {
      console.error("Failed to load items for combobox:", error)
      const message = error instanceof Error ? error.message : "Unknown error loading items."
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      return
    }

    if (!items.length && !isLoading && !loadError) {
      void handleLoad()
    }
  }, [handleLoad, isLoading, items.length, loadError, open])

  React.useEffect(() => {
    if (!value || selectedFromList) {
      setFallbackItem(null)
      setIsFetchingSelection(false)
      return
    }

    let isCancelled = false
    setIsFetchingSelection(true)

    const fetchSelection = async () => {
      try {
        const [itemRecord] = await fetchItemsByIds([value])

        if (!itemRecord) {
          setFallbackItem(null)
          return
        }

        const hydrated = await hydrateItemsWithMetadata([itemRecord])
        if (!isCancelled) {
          setFallbackItem(hydrated[0] ?? null)
        }
      } catch (error) {
        console.error("Failed to fetch selected item metadata:", error)
        if (!isCancelled) {
          setFallbackItem(null)
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingSelection(false)
        }
      }
    }

    void fetchSelection()

    return () => {
      isCancelled = true
    }
  }, [selectedFromList, value])

  React.useEffect(() => {
    if (!fallbackItem || !value || fallbackItem.item.id !== value) {
      return
    }

    onSelectionChange?.(fallbackItem)
  }, [fallbackItem, onSelectionChange, value])

  const handleClearSelection = React.useCallback(() => {
    onSelectionChange?.(null)
    onValueChange("")
    setFallbackItem(null)
  }, [onSelectionChange, onValueChange])

  const renderButtonLabel = () => {
    if (resolvedSelectedItem) {
      return formatItemForDisplay(resolvedSelectedItem.item, resolvedSelectedItem.cosmetic, resolvedSelectedItem.owner)
    }

    if (isFetchingSelection) {
      return "Loading selection..."
    }

    if (loadError) {
      return "Unable to load items"
    }

    return placeholder
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-12 w-full justify-between px-3"
          disabled={disabled}
        >
          <span className={cn("truncate", !resolvedSelectedItem && !isFetchingSelection && "text-muted-foreground")}>
            {renderButtonLabel()}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,90vw)] p-0" align="start" sideOffset={4}>
        <Command className="max-h-80 overflow-hidden">
          <CommandInput placeholder="Search by cosmetic, finish type, or owner..." />
          <CommandList className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items…
              </div>
            ) : loadError ? (
              <div className="space-y-2 px-4 py-6 text-sm text-muted-foreground">
                <p>We couldn&apos;t load items right now.</p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                  onClick={() => {
                    void handleLoad()
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <CommandEmpty>No items found.</CommandEmpty>
                {value ? (
                  <CommandGroup heading="Actions">
                    <CommandItem
                      value="clear-item-selection"
                      onSelect={() => {
                        handleClearSelection()
                        setOpen(false)
                      }}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <span className="text-destructive">Clear selection</span>
                    </CommandItem>
                  </CommandGroup>
                ) : null}
                <CommandGroup>
                  {items.map((itemWithMetadata) => {
                    const { item, cosmetic, owner } = itemWithMetadata
                    const displayText = formatItemForDisplay(item, cosmetic, owner)
                    return (
                      <CommandItem
                        key={item.id}
                        value={displayText}
                        onSelect={() => {
                          onSelectionChange?.(itemWithMetadata)
                          onValueChange(item.id)
                          setFallbackItem(null)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{cosmetic?.name || "Unknown Cosmetic"}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.finish_type || "Unknown"} • {owner?.display_name || "Unassigned"}
                          </span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {isTruncated ? (
                  <div className="px-4 pb-3 text-xs text-muted-foreground">
                    Showing first {ITEM_FETCH_LIMIT} results. Refine your search to narrow things down.
                  </div>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
