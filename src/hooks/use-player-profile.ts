/**
 * Hook for managing player profile sheet state and operations.
 * Encapsulates the common pattern of opening player profiles across pages.
 */

import * as React from "react"
import type { PlayerRecord } from "@/utils/supabase"

export interface PlayerProfileState {
  /** Currently selected player ID */
  selectedPlayerId: string | null
  /** Whether the profile sheet is open */
  isProfileOpen: boolean
  /** The currently selected player record */
  selectedPlayer: PlayerRecord | null
}

export interface PlayerProfileActions {
  /** Open profile for a specific player */
  openProfile: (player: PlayerRecord) => void
  /** Close the profile sheet */
  closeProfile: () => void
  /** Handle sheet open/close state changes */
  handleOpenChange: (open: boolean) => void
  /** Reset all state */
  reset: () => void
}

export type PlayerProfileReturn = PlayerProfileState & PlayerProfileActions

/**
 * Hook for managing player profile sheet state and operations.
 * 
 * @param players - Array of player records to search from
 * @returns Object containing state and actions for profile management
 */
export function usePlayerProfile(players: PlayerRecord[]): PlayerProfileReturn {
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)

  const selectedPlayer = React.useMemo(() => {
    if (!selectedPlayerId) {
      return null
    }
    return players.find(player => player.id === selectedPlayerId) ?? null
  }, [players, selectedPlayerId])

  const openProfile = React.useCallback((player: PlayerRecord) => {
    setSelectedPlayerId(player.id)
    setIsProfileOpen(true)
  }, [])

  const closeProfile = React.useCallback(() => {
    setIsProfileOpen(false)
    setSelectedPlayerId(null)
  }, [])

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsProfileOpen(open)
    if (!open) {
      setSelectedPlayerId(null)
    }
  }, [])

  const reset = React.useCallback(() => {
    setSelectedPlayerId(null)
    setIsProfileOpen(false)
  }, [])

  return {
    selectedPlayerId,
    isProfileOpen,
    selectedPlayer,
    openProfile,
    closeProfile,
    handleOpenChange,
    reset,
  }
}
