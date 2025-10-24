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
import { fetchCosmetics, type CosmeticRecord } from "@/utils/supabase"

interface CosmeticComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onSelectionChange?: (cosmetic: CosmeticRecord | null) => void
}

export function CosmeticCombobox({
  value,
  onValueChange,
  placeholder = "Select cosmetic...",
  disabled = false,
  onSelectionChange,
}: CosmeticComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [cosmetics, setCosmetics] = React.useState<CosmeticRecord[]>([])
  const [loading, setLoading] = React.useState(false)

  // Load cosmetics when component mounts or when opened
  React.useEffect(() => {
    if (open && cosmetics.length === 0) {
      setLoading(true)
      fetchCosmetics()
        .then(setCosmetics)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, cosmetics.length])

  const selectedCosmetic = React.useMemo(() => {
    if (!value) return null
    return cosmetics.find(c => c.id === value)
  }, [value, cosmetics])

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
          {selectedCosmetic ? (
            <div className="flex flex-col items-start">
              <span className="font-medium">{selectedCosmetic.name}</span>
              <span className="text-xs text-muted-foreground">{selectedCosmetic.type}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search cosmetics..." />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading cosmetics...</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No cosmetics found.</CommandEmpty>
                {value ? (
                  <CommandGroup heading="Actions">
                    <CommandItem
                      value="clear-cosmetic-selection"
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
                  {cosmetics.map((cosmetic) => (
                    <CommandItem
                      key={cosmetic.id}
                      value={`${cosmetic.name} ${cosmetic.type}`}
                      onSelect={() => {
                        onSelectionChange?.(cosmetic)
                        onValueChange(cosmetic.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === cosmetic.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{cosmetic.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {cosmetic.type}
                          {cosmetic.exclusive_to_year && ` • ${cosmetic.exclusive_to_year}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
