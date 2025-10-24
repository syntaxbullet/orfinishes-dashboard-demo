import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
import { formatItemForDisplay } from "@/lib/event-utils"
import { createPlayerLookupMap, resolvePlayerByIdentifier } from "@/lib/player-utils"
import { fetchItems, fetchCosmeticsByIds, fetchPlayers, type ItemRecord, type CosmeticRecord, type PlayerRecord } from "@/utils/supabase"

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

export function ItemSearchCombobox({
  value,
  onValueChange,
  placeholder = "Search items...",
  disabled = false,
  onSelectionChange,
}: ItemSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<ItemWithMetadata[]>([])
  const [loading, setLoading] = React.useState(false)

  // Load items when component mounts or when opened
  React.useEffect(() => {
    if (open && items.length === 0) {
      setLoading(true)
      Promise.all([
        fetchItems(),
        fetchPlayers({ includeBanned: true }),
      ])
        .then(async ([itemsData, playersData]) => {
          // Get unique cosmetic IDs
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

          const playerLookup = createPlayerLookupMap(playersData)
          const cosmeticLookup = new Map(cosmetics.map(c => [c.id, c]))

          const itemsWithMetadata: ItemWithMetadata[] = itemsData.map(item => {
            const cosmetic = item.cosmetic ? cosmeticLookup.get(item.cosmetic.trim()) : null
            const owner = item.current_owner ? resolvePlayerByIdentifier(item.current_owner, playerLookup) : null
            
            return {
              item,
              cosmetic,
              owner,
            }
          })

          setItems(itemsWithMetadata)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, items.length])

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return items.find(i => i.item.id === value)
  }, [value, items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 px-3"
          disabled={disabled}
        >
          {selectedItem ? (
            <span className="truncate">
              {formatItemForDisplay(selectedItem.item, selectedItem.cosmetic, selectedItem.owner)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search by cosmetic name, finish type, or owner..." />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading items...</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No items found.</CommandEmpty>
                {value ? (
                  <CommandGroup heading="Actions">
                    <CommandItem
                      value="clear-item-selection"
                      onSelect={() => {
                        onSelectionChange?.(null)
                        onValueChange("")
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
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === item.id ? "opacity-100" : "opacity-0"
                          )}
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
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
