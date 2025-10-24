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
import { PlayerAvatar } from "@/components/player-avatar"
import { createPlayerDisplayInfo, type PlayerDisplayInfo } from "@/lib/player-utils"
import { fetchPlayers, type PlayerRecord } from "@/utils/supabase"

interface PlayerComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function PlayerCombobox({
  value,
  onValueChange,
  placeholder = "Select player...",
  disabled = false,
}: PlayerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [players, setPlayers] = React.useState<PlayerRecord[]>([])
  const [loading, setLoading] = React.useState(false)

  // Load players when component mounts or when opened
  React.useEffect(() => {
    if (open && players.length === 0) {
      setLoading(true)
      fetchPlayers({ includeBanned: true })
        .then(setPlayers)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, players.length])

  const selectedPlayer = React.useMemo(() => {
    if (!value) return null
    return players.find(p => p.id === value)
  }, [value, players])

  const selectedDisplayInfo = React.useMemo(() => {
    if (!selectedPlayer) return null
    return createPlayerDisplayInfo(selectedPlayer, 32)
  }, [selectedPlayer])

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
          {selectedDisplayInfo ? (
            <div className="flex items-center gap-2">
              <PlayerAvatar profile={selectedDisplayInfo} size="sm" />
              <span className="truncate">{selectedDisplayInfo.displayName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading players...</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No players found.</CommandEmpty>
                <CommandGroup>
                  {players.map((player) => {
                    const displayInfo = createPlayerDisplayInfo(player, 32)
                    return (
                      <CommandItem
                        key={player.id}
                        value={`${player.display_name || ""} ${player.minecraft_uuid}`}
                        onSelect={() => {
                          onValueChange(player.id)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === player.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <PlayerAvatar profile={displayInfo} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-medium">{displayInfo.displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              {player.minecraft_uuid}
                            </span>
                          </div>
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
