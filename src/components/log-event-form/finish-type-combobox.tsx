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

// Hardcoded list of finish types
const FINISH_TYPES: string[] = [
  "Bubble",
  "Chrome",
  "Floral",
  "Galaxy",
  "Glitch",
  "Gold",
  "Iridescent",
  "Matrix",
  "Molten",
  "Rainbow",
  "Void"
]

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
  const finishTypes = FINISH_TYPES

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
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,90vw)] p-0" align="start" sideOffset={4}>
        <Command className="max-h-80 overflow-hidden">
          <CommandInput placeholder="Search finish types..." />
          <CommandList className="max-h-72 overflow-y-auto">
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
