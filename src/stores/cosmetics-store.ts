/**
 * Cosmetics Store - Centralized state management for cosmetic catalog data
 * Used by: Dashboard, Events, Catalog, Items, Log Event
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { CosmeticRecord } from '@/utils/supabase'
import { fetchCosmetics, fetchCosmeticsByIds } from '@/utils/supabase'
import { createBaseState, createBaseActions, shouldRefresh, handleStoreError, type StoreState, type StoreActions } from './utils'

interface CosmeticsState extends StoreState {
  cosmetics: CosmeticRecord[]
  cosmeticsById: Map<string, CosmeticRecord>
}

interface CosmeticsActions extends StoreActions {
  setCosmetics: (cosmetics: CosmeticRecord[]) => void
  addCosmetic: (cosmetic: CosmeticRecord) => void
  updateCosmetic: (cosmeticId: string, updates: Partial<CosmeticRecord>) => void
  removeCosmetic: (cosmeticId: string) => void
  fetchCosmetics: (forceRefresh?: boolean) => Promise<void>
  fetchCosmeticsByIds: (ids: string[]) => Promise<CosmeticRecord[]>
  refreshCosmetics: () => Promise<void>
  getCosmeticById: (id: string) => CosmeticRecord | null
  getCosmeticsByIds: (ids: string[]) => CosmeticRecord[]
  searchCosmetics: (query: string) => CosmeticRecord[]
}

type CosmeticsStore = CosmeticsState & CosmeticsActions

export const useCosmeticsStore = create<CosmeticsStore>()(
  subscribeWithSelector((set, get) => ({
    // Base state
    ...createBaseState(),
    
    // Cosmetics data
    cosmetics: [],
    cosmeticsById: new Map(),
    
    // Base actions
    ...createBaseActions<CosmeticsState>(),
    
    // Cosmetics-specific actions
    setCosmetics: (cosmetics: CosmeticRecord[]) => {
      const cosmeticsById = new Map<string, CosmeticRecord>()
      cosmetics.forEach(cosmetic => {
        cosmeticsById.set(cosmetic.id, cosmetic)
      })
      
      set({
        cosmetics,
        cosmeticsById,
        lastFetched: Date.now(),
        error: null,
      })
    },
    
    addCosmetic: (cosmetic: CosmeticRecord) => {
      const { cosmetics, cosmeticsById } = get()
      const newCosmetics = [...cosmetics, cosmetic]
      const newCosmeticsById = new Map(cosmeticsById)
      newCosmeticsById.set(cosmetic.id, cosmetic)
      
      set({
        cosmetics: newCosmetics,
        cosmeticsById: newCosmeticsById,
      })
    },
    
    updateCosmetic: (cosmeticId: string, updates: Partial<CosmeticRecord>) => {
      const { cosmetics, cosmeticsById } = get()
      const cosmeticIndex = cosmetics.findIndex(c => c.id === cosmeticId)
      
      if (cosmeticIndex === -1) {
        return
      }
      
      const updatedCosmetic = { ...cosmetics[cosmeticIndex], ...updates } as CosmeticRecord
      const newCosmetics = [...cosmetics]
      newCosmetics[cosmeticIndex] = updatedCosmetic
      
      const newCosmeticsById = new Map(cosmeticsById)
      newCosmeticsById.set(cosmeticId, updatedCosmetic)
      
      set({
        cosmetics: newCosmetics,
        cosmeticsById: newCosmeticsById,
      })
    },
    
    removeCosmetic: (cosmeticId: string) => {
      const { cosmetics, cosmeticsById } = get()
      const newCosmetics = cosmetics.filter(c => c.id !== cosmeticId)
      const newCosmeticsById = new Map(cosmeticsById)
      newCosmeticsById.delete(cosmeticId)
      
      set({
        cosmetics: newCosmetics,
        cosmeticsById: newCosmeticsById,
      })
    },
    
    fetchCosmetics: async (forceRefresh = false) => {
      const state = get()
      
      // Don't fetch if already loading/refreshing
      if (state.isLoading || state.isRefreshing) {
        return
      }
            
      // Don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && !shouldRefresh(state)) {
        return
      }
      
      const isRefresh = state.cosmetics.length > 0
      
      set({
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      })
      
      try {
        const cosmetics = await fetchCosmetics()
        get().setCosmetics(cosmetics)
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
    
    fetchCosmeticsByIds: async (ids: string[]) => {
      const { cosmeticsById } = get()
      const missingIds = ids.filter(id => !cosmeticsById.has(id))
      
      if (missingIds.length === 0) {
        return ids.map(id => cosmeticsById.get(id)!).filter(Boolean)
      }
      
      try {
        const cosmetics = await fetchCosmeticsByIds(missingIds)
        
        // Add new cosmetics to store
        const { addCosmetic } = get()
        cosmetics.forEach(cosmetic => addCosmetic(cosmetic))
        
        // Return all requested cosmetics
        return ids.map(id => {
          const existing = cosmeticsById.get(id)
          if (existing) {
            return existing
          }
          return cosmetics.find(c => c.id === id)
        }).filter(Boolean) as CosmeticRecord[]
      } catch (error) {
        console.error('Failed to fetch cosmetics by IDs:', error)
        return []
      }
    },
    
    refreshCosmetics: () => {
      return get().fetchCosmetics(true)
    },
    
    getCosmeticById: (id: string) => {
      return get().cosmeticsById.get(id) || null
    },
    
    getCosmeticsByIds: (ids: string[]) => {
      const { cosmeticsById } = get()
      return ids.map(id => cosmeticsById.get(id)).filter(Boolean) as CosmeticRecord[]
    },
    
    searchCosmetics: (query: string) => {
      const { cosmetics } = get()
      const lowercaseQuery = query.toLowerCase()
      
      return cosmetics.filter(cosmetic => 
        cosmetic.name.toLowerCase().includes(lowercaseQuery) ||
        cosmetic.type?.toLowerCase().includes(lowercaseQuery) ||
        cosmetic.source?.toLowerCase().includes(lowercaseQuery)
      )
    },
  }))
)

// Auto-refresh when data becomes stale
let refreshTimeout: NodeJS.Timeout | null = null

useCosmeticsStore.subscribe(
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
        const state = useCosmeticsStore.getState()
        if (shouldRefresh(state)) {
          state.refreshCosmetics()
        }
      }, timeUntilStale)
    }
  }
)

// Export selectors for common use cases
export const useCosmetics = () => useCosmeticsStore((state) => state.cosmetics)
export const useCosmeticsLoading = () => useCosmeticsStore((state) => state.isLoading)
export const useCosmeticsRefreshing = () => useCosmeticsStore((state) => state.isRefreshing)
export const useCosmeticsError = () => useCosmeticsStore((state) => state.error)
export const useCosmeticById = (id: string) => useCosmeticsStore((state) => state.getCosmeticById(id))
export const useCosmeticsByIds = (ids: string[]) => useCosmeticsStore((state) => state.getCosmeticsByIds(ids))
export const useSearchCosmetics = (query: string) => useCosmeticsStore((state) => state.searchCosmetics(query))
