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
import { getUniqueFinishTypes } from "@/lib/event-utils"
import { fetchItems, type ItemRecord } from "@/utils/supabase"

interface FinishTypeComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function FinishTypeCombobox({
  value,
  onValueChange,
  placeholder = "Select finish type...",
  disabled = false,
}: FinishTypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [finishTypes, setFinishTypes] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  // Load finish types when component mounts or when opened
  React.useEffect(() => {
    if (open && finishTypes.length === 0) {
      setLoading(true)
      fetchItems()
        .then(items => {
          const types = getUniqueFinishTypes(items)
          setFinishTypes(types)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, finishTypes.length])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search finish types..." />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading finish types...</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No finish types found.</CommandEmpty>
                <CommandGroup>
                  {finishTypes.map((finishType) => (
                    <CommandItem
                      key={finishType}
                      value={finishType}
                      onSelect={() => {
                        onValueChange(finishType)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === finishType ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{finishType}</span>
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
