/**
 * Snapshots Store - Centralized state management for aggregated item ownership snapshots
 * Used by: Dashboard, Player Profile Sheet
 * Derived/cached from events data with smart refresh logic
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ItemOwnershipSnapshot } from '@/utils/supabase'
import { fetchItemOwnershipSnapshots } from '@/utils/supabase'
import { createBaseState, createBaseActions, shouldRefresh, handleStoreError, type StoreState, type StoreActions } from './utils'

interface SnapshotsState extends StoreState {
  snapshots: ItemOwnershipSnapshot[]
  snapshotsByItemId: Map<string, ItemOwnershipSnapshot>
  snapshotsByPlayerId: Map<string, ItemOwnershipSnapshot[]>
}

interface SnapshotsActions extends StoreActions {
  setSnapshots: (snapshots: ItemOwnershipSnapshot[]) => void
  addSnapshot: (snapshot: ItemOwnershipSnapshot) => void
  updateSnapshot: (itemId: string, updates: Partial<ItemOwnershipSnapshot>) => void
  removeSnapshot: (itemId: string) => void
  fetchSnapshots: (forceRefresh?: boolean) => Promise<void>
  refreshSnapshots: () => Promise<void>
  getSnapshotByItemId: (itemId: string) => ItemOwnershipSnapshot | null
  getSnapshotsByPlayerId: (playerId: string) => ItemOwnershipSnapshot[]
  getSnapshotsByFinishType: (finishType: string) => ItemOwnershipSnapshot[]
  getUnassignedSnapshots: () => ItemOwnershipSnapshot[]
  getTotalItems: () => number
  getAssignedItems: () => number
  getOwnershipCoverage: () => number
}

type SnapshotsStore = SnapshotsState & SnapshotsActions

export const useSnapshotsStore = create<SnapshotsStore>()(
  subscribeWithSelector((set, get) => ({
    // Base state
    ...createBaseState(),
    
    // Snapshots data
    snapshots: [],
    snapshotsByItemId: new Map(),
    snapshotsByPlayerId: new Map(),
    
    // Base actions
    ...createBaseActions<SnapshotsState>(),
    
    // Snapshots-specific actions
    setSnapshots: (snapshots: ItemOwnershipSnapshot[]) => {
      const snapshotsByItemId = new Map<string, ItemOwnershipSnapshot>()
      const snapshotsByPlayerId = new Map<string, ItemOwnershipSnapshot[]>()
      
      snapshots.forEach(snapshot => {
        // Index by item ID
        snapshotsByItemId.set(snapshot.item_id, snapshot)
        
        // Index by player ID
        const playerId = snapshot.latest_to_player_id
        if (playerId) {
          const existing = snapshotsByPlayerId.get(playerId) || []
          snapshotsByPlayerId.set(playerId, [...existing, snapshot])
        }
      })
      
      set({
        snapshots,
        snapshotsByItemId,
        snapshotsByPlayerId,
        lastFetched: Date.now(),
        error: null,
      })
    },
    
    addSnapshot: (snapshot: ItemOwnershipSnapshot) => {
      const { snapshots, snapshotsByItemId, snapshotsByPlayerId } = get()
      const newSnapshots = [...snapshots, snapshot]
      const newSnapshotsByItemId = new Map(snapshotsByItemId)
      newSnapshotsByItemId.set(snapshot.item_id, snapshot)
      
      const newSnapshotsByPlayerId = new Map(snapshotsByPlayerId)
      const playerId = snapshot.latest_to_player_id
      if (playerId) {
        const existing = newSnapshotsByPlayerId.get(playerId) || []
        newSnapshotsByPlayerId.set(playerId, [...existing, snapshot])
      }
      
      set({
        snapshots: newSnapshots,
        snapshotsByItemId: newSnapshotsByItemId,
        snapshotsByPlayerId: newSnapshotsByPlayerId,
      })
    },
    
    updateSnapshot: (itemId: string, updates: Partial<ItemOwnershipSnapshot>) => {
      const { snapshots, snapshotsByItemId, snapshotsByPlayerId } = get()
      const snapshotIndex = snapshots.findIndex(s => s.item_id === itemId)
      
      if (snapshotIndex === -1) {
        return
      }
      
      const updatedSnapshot = { ...snapshots[snapshotIndex], ...updates }
      const newSnapshots = [...snapshots]
      newSnapshots[snapshotIndex] = updatedSnapshot
      
      const newSnapshotsByItemId = new Map(snapshotsByItemId)
      newSnapshotsByItemId.set(itemId, updatedSnapshot)
      
      // Update player index if player changed
      const newSnapshotsByPlayerId = new Map(snapshotsByPlayerId)
      const oldPlayerId = snapshots[snapshotIndex].latest_to_player_id
      const newPlayerId = updatedSnapshot.latest_to_player_id
      
      if (oldPlayerId && oldPlayerId !== newPlayerId) {
        // Remove from old player
        const oldPlayerSnapshots = newSnapshotsByPlayerId.get(oldPlayerId) || []
        const filteredOldPlayerSnapshots = oldPlayerSnapshots.filter(s => s.item_id !== itemId)
        if (filteredOldPlayerSnapshots.length > 0) {
          newSnapshotsByPlayerId.set(oldPlayerId, filteredOldPlayerSnapshots)
        } else {
          newSnapshotsByPlayerId.delete(oldPlayerId)
        }
      }
      
      if (newPlayerId) {
        // Add to new player
        const newPlayerSnapshots = newSnapshotsByPlayerId.get(newPlayerId) || []
        const filteredNewPlayerSnapshots = newPlayerSnapshots.filter(s => s.item_id !== itemId)
        newSnapshotsByPlayerId.set(newPlayerId, [...filteredNewPlayerSnapshots, updatedSnapshot])
      }
      
      set({
        snapshots: newSnapshots,
        snapshotsByItemId: newSnapshotsByItemId,
        snapshotsByPlayerId: newSnapshotsByPlayerId,
      })
    },
    
    removeSnapshot: (itemId: string) => {
      const { snapshots, snapshotsByItemId, snapshotsByPlayerId } = get()
      const snapshot = snapshots.find(s => s.item_id === itemId)
      
      if (!snapshot) {
        return
      }
      
      const newSnapshots = snapshots.filter(s => s.item_id !== itemId)
      const newSnapshotsByItemId = new Map(snapshotsByItemId)
      newSnapshotsByItemId.delete(itemId)
      
      const newSnapshotsByPlayerId = new Map(snapshotsByPlayerId)
      const playerId = snapshot.latest_to_player_id
      if (playerId) {
        const playerSnapshots = newSnapshotsByPlayerId.get(playerId) || []
        const filteredPlayerSnapshots = playerSnapshots.filter(s => s.item_id !== itemId)
        if (filteredPlayerSnapshots.length > 0) {
          newSnapshotsByPlayerId.set(playerId, filteredPlayerSnapshots)
        } else {
          newSnapshotsByPlayerId.delete(playerId)
        }
      }
      
      set({
        snapshots: newSnapshots,
        snapshotsByItemId: newSnapshotsByItemId,
        snapshotsByPlayerId: newSnapshotsByPlayerId,
      })
    },
    
    fetchSnapshots: async (forceRefresh = false) => {
      const state = get()
      
      // Don't fetch if already loading/refreshing
      if (state.isLoading || state.isRefreshing) {
        return
      }
      
      // Don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && !shouldRefresh(state)) {
        return
      }
      
      const isRefresh = state.snapshots.length > 0
      
      set({
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      })
      
      try {
        const snapshots = await fetchItemOwnershipSnapshots()
        get().setSnapshots(snapshots)
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
    
    refreshSnapshots: () => {
      return get().fetchSnapshots(true)
    },
    
    getSnapshotByItemId: (itemId: string) => {
      return get().snapshotsByItemId.get(itemId) || null
    },
    
    getSnapshotsByPlayerId: (playerId: string) => {
      return get().snapshotsByPlayerId.get(playerId) || []
    },
    
    getSnapshotsByFinishType: (finishType: string) => {
      const { snapshots } = get()
      return snapshots.filter(snapshot => snapshot.finish_type === finishType)
    },
    
    getUnassignedSnapshots: () => {
      const { snapshots } = get()
      return snapshots.filter(snapshot => !snapshot.latest_to_player_id)
    },
    
    getTotalItems: () => {
      return get().snapshots.length
    },
    
    getAssignedItems: () => {
      const { snapshots } = get()
      return snapshots.filter(snapshot => snapshot.latest_to_player_id).length
    },
    
    getOwnershipCoverage: () => {
      const { snapshots } = get()
      const total = snapshots.length
      if (total === 0) {
        return 0
      }
      const assigned = snapshots.filter(snapshot => snapshot.latest_to_player_id).length
      return assigned / total
    },
  }))
)

// Auto-refresh when data becomes stale
let refreshTimeout: NodeJS.Timeout | null = null

useSnapshotsStore.subscribe(
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
        const state = useSnapshotsStore.getState()
        if (shouldRefresh(state)) {
          state.refreshSnapshots()
        }
      }, timeUntilStale)
    }
  }
)

// Export selectors for common use cases
export const useSnapshots = () => useSnapshotsStore((state) => state.snapshots)
export const useSnapshotsLoading = () => useSnapshotsStore((state) => state.isLoading)
export const useSnapshotsRefreshing = () => useSnapshotsStore((state) => state.isRefreshing)
export const useSnapshotsError = () => useSnapshotsStore((state) => state.error)
export const useSnapshotByItemId = (itemId: string) => useSnapshotsStore((state) => state.getSnapshotByItemId(itemId))
export const useSnapshotsByPlayerId = (playerId: string) => useSnapshotsStore((state) => state.getSnapshotsByPlayerId(playerId))
export const useSnapshotsByFinishType = (finishType: string) => useSnapshotsStore((state) => state.getSnapshotsByFinishType(finishType))
export const useUnassignedSnapshots = () => useSnapshotsStore((state) => state.getUnassignedSnapshots())
export const useTotalItems = () => useSnapshotsStore((state) => state.getTotalItems())
export const useAssignedItems = () => useSnapshotsStore((state) => state.getAssignedItems())
export const useOwnershipCoverage = () => useSnapshotsStore((state) => state.getOwnershipCoverage())
