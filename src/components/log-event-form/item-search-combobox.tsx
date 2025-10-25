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
  fetchItemsByIds,
  fetchPlayers,
  searchItems,
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

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_LIMIT = 50

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function ItemSearchCombobox({
  value,
  onValueChange,
  placeholder = "Search items...",
  disabled = false,
  onSelectionChange,
}: ItemSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [items, setItems] = React.useState<ItemWithMetadata[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [fallbackItem, setFallbackItem] = React.useState<ItemWithMetadata | null>(null)
  const [isFetchingSelection, setIsFetchingSelection] = React.useState(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  const selectedFromList = React.useMemo(() => {
    if (!value) {
      return null
    }
    return items.find((candidate) => candidate.item.id === value) ?? null
  }, [items, value])

  const resolvedSelectedItem = selectedFromList ?? fallbackItem

  // Search items with debounced query
  React.useEffect(() => {
    if (!open) {
      return
    }

    const performSearch = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const fetchedItems = await searchItems({
          search: debouncedSearchQuery || undefined,
          limit: SEARCH_LIMIT,
        })
        
        // The searchItems function already returns items with joined cosmetic and player data
        // so we need to transform them to match our ItemWithMetadata interface
        const transformedItems: ItemWithMetadata[] = fetchedItems.map((item: ItemRecord & { cosmetics?: CosmeticRecord; players?: PlayerRecord }) => ({
          item: {
            id: item.id,
            cosmetic: item.cosmetic,
            finish_type: item.finish_type,
            current_owner: item.current_owner,
            minted_by: item.minted_by,
            minted_at: item.minted_at,
            created_at: item.created_at,
            updated_at: item.updated_at,
          },
          cosmetic: item.cosmetics ? {
            id: item.cosmetics.id || item.cosmetic,
            name: item.cosmetics.name,
            type: item.cosmetics.type,
            source: item.cosmetics.source || "unknown",
            exclusive_to_year: item.cosmetics.exclusive_to_year,
            created_at: item.cosmetics.created_at,
            updated_at: item.cosmetics.updated_at,
          } : null,
          owner: item.players && item.players.id ? {
            id: item.players.id,
            display_name: item.players.display_name,
            minecraft_uuid: item.players.minecraft_uuid,
            is_banned: item.players.is_banned,
            avatar_storage_path: item.players.avatar_storage_path,
            avatar_synced_at: item.players.avatar_synced_at,
            profile_synced_at: item.players.profile_synced_at,
            created_at: item.players.created_at,
            updated_at: item.players.updated_at,
          } : null,
        }))

        setItems(transformedItems)
      } catch (error) {
        console.error("Failed to search items:", error)
        const message = error instanceof Error ? error.message : "Unknown error searching items."
        setLoadError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void performSearch()
  }, [open, debouncedSearchQuery])

  // Fetch selected item when value changes
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

        // Fetch cosmetic and player data for the selected item
        const cosmeticId = itemRecord.cosmetic?.trim()
        const [cosmetics, players] = await Promise.all([
          cosmeticId ? fetchCosmeticsByIds([cosmeticId]) : Promise.resolve([]),
          fetchPlayers({ includeBanned: true }),
        ])

        const cosmetic = cosmetics[0] || null
        const playerLookup = createPlayerLookupMap(players)
        const owner = itemRecord.current_owner 
          ? resolvePlayerByIdentifier(itemRecord.current_owner, playerLookup) 
          : null

        if (!isCancelled) {
          setFallbackItem({
            item: itemRecord,
            cosmetic,
            owner,
          })
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
          <CommandInput 
            placeholder="Search by cosmetic, finish type, or owner..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {searchQuery ? "Searching items…" : "Loading items…"}
              </div>
            ) : loadError ? (
              <div className="space-y-2 px-4 py-6 text-sm text-muted-foreground">
                <p>We couldn&apos;t load items right now.</p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                  onClick={() => {
                    setSearchQuery("")
                    setLoadError(null)
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery ? "No items found matching your search." : "Start typing to search items..."}
                </CommandEmpty>
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
                {items.length >= SEARCH_LIMIT ? (
                  <div className="px-4 pb-3 text-xs text-muted-foreground">
                    Showing first {SEARCH_LIMIT} results. Refine your search to narrow things down.
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
