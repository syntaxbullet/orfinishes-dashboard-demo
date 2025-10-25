/**
 * Players Store - Centralized state management for player data
 * Used by: Dashboard, Events, Items, Players, Log Event, Player Profile Sheet
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { PlayerRecord } from '@/utils/supabase'
import { fetchPlayers } from '@/utils/supabase'
import { createBaseState, createBaseActions, shouldRefresh, handleStoreError, type StoreState, type StoreActions } from './utils'

interface PlayersState extends StoreState {
  players: PlayerRecord[]
  playersById: Map<string, PlayerRecord>
}

interface PlayersActions extends StoreActions {
  setPlayers: (players: PlayerRecord[]) => void
  addPlayer: (player: PlayerRecord) => void
  updatePlayer: (playerId: string, updates: Partial<PlayerRecord>) => void
  removePlayer: (playerId: string) => void
  fetchPlayers: (options?: { includeBanned?: boolean; forceRefresh?: boolean }) => Promise<void>
  refreshPlayers: () => Promise<void>
  getPlayerById: (id: string) => PlayerRecord | null
  getPlayersByIds: (ids: string[]) => PlayerRecord[]
}

type PlayersStore = PlayersState & PlayersActions

export const usePlayersStore = create<PlayersStore>()(
  subscribeWithSelector((set, get) => ({
    // Base state
    ...createBaseState(),
    
    // Players data
    players: [],
    playersById: new Map(),
    
    // Base actions
    ...createBaseActions<PlayersState>(),
    
    // Players-specific actions
    setPlayers: (players: PlayerRecord[]) => {
      const playersById = new Map<string, PlayerRecord>()
      players.forEach(player => {
        if (player.id) {
          playersById.set(player.id, player)
        }
      })
      
      set({
        players,
        playersById,
        lastFetched: Date.now(),
        error: null,
      })
    },
    
    addPlayer: (player: PlayerRecord) => {
      const { players, playersById } = get()
      const newPlayers = [...players, player]
      const newPlayersById = new Map(playersById)
      if (player.id) {
        newPlayersById.set(player.id, player)
      }
      
      set({
        players: newPlayers,
        playersById: newPlayersById,
      })
    },
    
    updatePlayer: (playerId: string, updates: Partial<PlayerRecord>) => {
      const { players, playersById } = get()
      const playerIndex = players.findIndex(p => p.id === playerId)
      
      if (playerIndex === -1) {
        return
      }
      
      const updatedPlayer = { ...players[playerIndex], ...updates } as PlayerRecord
      const newPlayers = [...players]
      newPlayers[playerIndex] = updatedPlayer
      
      const newPlayersById = new Map(playersById)
      newPlayersById.set(playerId, updatedPlayer)
      
      set({
        players: newPlayers,
        playersById: newPlayersById,
      })
    },
    
    removePlayer: (playerId: string) => {
      const { players, playersById } = get()
      const newPlayers = players.filter(p => p.id !== playerId)
      const newPlayersById = new Map(playersById)
      newPlayersById.delete(playerId)
      
      set({
        players: newPlayers,
        playersById: newPlayersById,
      })
    },
    
    fetchPlayers: async (options = {}) => {
      const { includeBanned = true, forceRefresh = false } = options
      const state = get()
      
      // Don't fetch if already loading/refreshing
      if (state.isLoading || state.isRefreshing) {
        return
      }
      
      // Don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && !shouldRefresh(state)) {
        return
      }
      
      const isRefresh = state.players.length > 0
      
      set({
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      })
      
      try {
        const players = await fetchPlayers({ includeBanned })
        get().setPlayers(players)
      } catch (error) {
        set({
          error: handleStoreError(error),
        })
      } finally {
        set({
          isLoading: false,
          isRefreshing: false,
        })
      }
    },
    
    refreshPlayers: () => {
      return get().fetchPlayers({ forceRefresh: true })
    },
    
    getPlayerById: (id: string) => {
      return get().playersById.get(id) || null
    },
    
    getPlayersByIds: (ids: string[]) => {
      const { playersById } = get()
      return ids.map(id => playersById.get(id)).filter(Boolean) as PlayerRecord[]
    },
  }))
)

// Auto-refresh when data becomes stale
let refreshTimeout: NodeJS.Timeout | null = null

usePlayersStore.subscribe(
  (state) => state.lastFetched,
  (lastFetched) => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout)
    }
    
    if (!lastFetched) {
      return
    }
    
    const staleTime = 5 * 60 * 1000 // 5 minutes
    const timeUntilStale = staleTime - (Date.now() - lastFetched)
    
    if (timeUntilStale > 0) {
      refreshTimeout = setTimeout(() => {
        const state = usePlayersStore.getState()
        if (shouldRefresh(state)) {
          state.refreshPlayers()
        }
      }, timeUntilStale)
    }
  }
)

// Export selectors for common use cases
export const usePlayers = () => usePlayersStore((state) => state.players)
export const usePlayersLoading = () => usePlayersStore((state) => state.isLoading)
export const usePlayersRefreshing = () => usePlayersStore((state) => state.isRefreshing)
export const usePlayersError = () => usePlayersStore((state) => state.error)
export const usePlayerById = (id: string) => usePlayersStore((state) => state.getPlayerById(id))
export const usePlayersByIds = (ids: string[]) => usePlayersStore((state) => state.getPlayersByIds(ids))
