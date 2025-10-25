/**
 * Items Store - Centralized state management for item records
 * Used by: Events, Items, Log Event
 * Features optimistic updates for create/delete operations
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ItemRecord } from '@/utils/supabase'
import { fetchItems, fetchItemsByIds, fetchItemsCount, createItem, deleteItem } from '@/utils/supabase'
import { createBaseState, createBaseActions, shouldRefresh, handleStoreError, type StoreState, type StoreActions } from './utils'

interface ItemsState extends StoreState {
  items: ItemRecord[]
  itemsById: Map<string, ItemRecord>
  totalCount: number
  optimisticItems: Set<string> // Track items being created/deleted
}

interface ItemsActions extends StoreActions {
  setItems: (items: ItemRecord[]) => void
  setTotalCount: (count: number) => void
  addItem: (item: ItemRecord) => void
  updateItem: (itemId: string, updates: Partial<ItemRecord>) => void
  removeItem: (itemId: string) => void
  fetchItems: (forceRefresh?: boolean) => Promise<void>
  fetchItemsByIds: (ids: string[]) => Promise<ItemRecord[]>
  fetchItemsCount: () => Promise<number>
  refreshItems: () => Promise<void>
  getItemById: (id: string) => ItemRecord | null
  getItemsByIds: (ids: string[]) => ItemRecord[]
  searchItems: (query: string) => ItemRecord[]
  
  // Optimistic operations
  createItemOptimistic: (itemData: Omit<ItemRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<ItemRecord>
  deleteItemOptimistic: (itemId: string) => Promise<void>
}

type ItemsStore = ItemsState & ItemsActions

export const useItemsStore = create<ItemsStore>()(
  subscribeWithSelector((set, get) => ({
    // Base state
    ...createBaseState(),
    
    // Items data
    items: [],
    itemsById: new Map(),
    totalCount: 0,
    optimisticItems: new Set(),
    
    // Base actions
    ...createBaseActions<ItemsState>(),
    
    // Items-specific actions
    setItems: (items: ItemRecord[]) => {
      const itemsById = new Map<string, ItemRecord>()
      items.forEach(item => {
        itemsById.set(item.id, item)
      })
      
      set({
        items,
        itemsById,
        lastFetched: Date.now(),
        error: null,
      })
    },
    
    setTotalCount: (count: number) => {
      set({ totalCount: count })
    },
    
    addItem: (item: ItemRecord) => {
      const { items, itemsById } = get()
      const newItems = [...items, item]
      const newItemsById = new Map(itemsById)
      newItemsById.set(item.id, item)
      
      set({
        items: newItems,
        itemsById: newItemsById,
        totalCount: get().totalCount + 1,
      })
    },
    
    updateItem: (itemId: string, updates: Partial<ItemRecord>) => {
      const { items, itemsById } = get()
      const itemIndex = items.findIndex(i => i.id === itemId)
      
      if (itemIndex === -1) {
        return
      }
      
      const updatedItem = { ...items[itemIndex], ...updates } as ItemRecord
      const newItems = [...items]
      newItems[itemIndex] = updatedItem
      
      const newItemsById = new Map(itemsById)
      newItemsById.set(itemId, updatedItem)
      
      set({
        items: newItems,
        itemsById: newItemsById,
      })
    },
    
    removeItem: (itemId: string) => {
      const { items, itemsById } = get()
      const newItems = items.filter(i => i.id !== itemId)
      const newItemsById = new Map(itemsById)
      newItemsById.delete(itemId)
      
      set({
        items: newItems,
        itemsById: newItemsById,
        totalCount: Math.max(0, get().totalCount - 1),
      })
    },
    
    fetchItems: async (forceRefresh = false) => {
      const state = get()
      
      // Don't fetch if already loading/refreshing
      if (state.isLoading || state.isRefreshing) {
        return
      }
      
      // Don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && !shouldRefresh(state)) {
        return
      }
      
      const isRefresh = state.items.length > 0
      
      set({
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      })
      
      try {
        const [items, totalCount] = await Promise.all([
          fetchItems(),
          fetchItemsCount(),
        ])
        
        get().setItems(items)
        get().setTotalCount(totalCount)
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
    
    fetchItemsByIds: async (ids: string[]) => {
      const { itemsById } = get()
      const missingIds = ids.filter(id => !itemsById.has(id))
      
      if (missingIds.length === 0) {
        return ids.map(id => itemsById.get(id)!).filter(Boolean)
      }
      
      try {
        const items = await fetchItemsByIds(missingIds)
        
        // Add new items to store
        const { addItem } = get()
        items.forEach(item => addItem(item))
        
        // Return all requested items
        return ids.map(id => {
          const existing = itemsById.get(id)
          if (existing) {
            return existing
          }
          return items.find(i => i.id === id)
        }).filter(Boolean) as ItemRecord[]
      } catch (error) {
        console.error('Failed to fetch items by IDs:', error)
        return []
      }
    },
    
    fetchItemsCount: async () => {
      try {
        const count = await fetchItemsCount()
        get().setTotalCount(count)
        return count
      } catch (error) {
        console.error('Failed to fetch items count:', error)
        return get().totalCount
      }
    },
    
    refreshItems: () => {
      return get().fetchItems(true)
    },
    
    getItemById: (id: string) => {
      return get().itemsById.get(id) || null
    },
    
    getItemsByIds: (ids: string[]) => {
      const { itemsById } = get()
      return ids.map(id => itemsById.get(id)).filter(Boolean) as ItemRecord[]
    },
    
    searchItems: (query: string) => {
      const { items } = get()
      const lowercaseQuery = query.toLowerCase()
      
      return items.filter(item => 
        item.id.toLowerCase().includes(lowercaseQuery) ||
        item.finish_type?.toLowerCase().includes(lowercaseQuery) ||
        item.current_owner?.toLowerCase().includes(lowercaseQuery) ||
        item.minted_by?.toLowerCase().includes(lowercaseQuery)
      )
    },
    
    // Optimistic operations
    createItemOptimistic: async (itemData) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const optimisticItem: ItemRecord = {
        ...itemData,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        minted_at: itemData.minted_at ?? null,
      }
      
      // Add optimistic item immediately
      const { addItem, optimisticItems } = get()
      addItem(optimisticItem)
      
      const newOptimisticItems = new Set(optimisticItems)
      newOptimisticItems.add(tempId)
      set({ optimisticItems: newOptimisticItems })
      
      try {
        const newItem = await createItem({
          ...itemData,
          minted_at: itemData.minted_at ?? undefined,
        })
        
        // Replace optimistic item with real item
        const { removeItem, addItem: addRealItem } = get()
        removeItem(tempId)
        addRealItem(newItem)
        
        // Remove from optimistic set
        const updatedOptimisticItems = new Set(get().optimisticItems)
        updatedOptimisticItems.delete(tempId)
        set({ optimisticItems: updatedOptimisticItems })
        
        return newItem
      } catch (error) {
        // Rollback optimistic update
        const { removeItem } = get()
        removeItem(tempId)
        
        const updatedOptimisticItems = new Set(get().optimisticItems)
        updatedOptimisticItems.delete(tempId)
        set({ optimisticItems: updatedOptimisticItems })
        
        throw error
      }
    },
    
    deleteItemOptimistic: async (itemId: string) => {
      const { itemsById, optimisticItems } = get()
      const item = itemsById.get(itemId)
      
      if (!item) {
        return
      }
      
      // Remove item immediately
      const { removeItem } = get()
      removeItem(itemId)
      
      const newOptimisticItems = new Set(optimisticItems)
      newOptimisticItems.add(itemId)
      set({ optimisticItems: newOptimisticItems })
      
      try {
        await deleteItem(itemId)
        
        // Remove from optimistic set
        const updatedOptimisticItems = new Set(get().optimisticItems)
        updatedOptimisticItems.delete(itemId)
        set({ optimisticItems: updatedOptimisticItems })
      } catch (error) {
        // Rollback optimistic update
        if (item) {
          const { addItem } = get()
          addItem(item)
        }
        
        const updatedOptimisticItems = new Set(get().optimisticItems)
        updatedOptimisticItems.delete(itemId)
        set({ optimisticItems: updatedOptimisticItems })
        
        throw error
      }
    },
  }))
)

// Auto-refresh when data becomes stale
let refreshTimeout: NodeJS.Timeout | null = null

useItemsStore.subscribe(
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
        const state = useItemsStore.getState()
        if (shouldRefresh(state)) {
          state.refreshItems()
        }
      }, timeUntilStale)
    }
  }
)

// Export selectors for common use cases
export const useItems = () => useItemsStore((state) => state.items)
export const useItemsLoading = () => useItemsStore((state) => state.isLoading)
export const useItemsRefreshing = () => useItemsStore((state) => state.isRefreshing)
export const useItemsError = () => useItemsStore((state) => state.error)
export const useItemsTotalCount = () => useItemsStore((state) => state.totalCount)
export const useItemById = (id: string) => useItemsStore((state) => state.getItemById(id))
export const useItemsByIds = (ids: string[]) => useItemsStore((state) => state.getItemsByIds(ids))
export const useSearchItems = (query: string) => useItemsStore((state) => state.searchItems(query))
export const useOptimisticItems = () => useItemsStore((state) => state.optimisticItems)
