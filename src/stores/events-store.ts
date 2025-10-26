/**
 * Events Store - Centralized state management for ownership event ledger
 * Used by: Dashboard, Events
 * Features cascade refresh to snapshots store when events change
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { OwnershipEventRecord, OwnershipAction } from '@/utils/supabase'
import { fetchOwnershipEvents, createOwnershipEvent, deleteOwnershipEvent } from '@/utils/supabase'
import { createBaseState, createBaseActions, shouldRefresh, handleStoreError, type StoreState, type StoreActions } from './utils'

interface EventsState extends StoreState {
  events: OwnershipEventRecord[]
  eventsById: Map<string, OwnershipEventRecord>
  optimisticEvents: Set<string> // Track events being created/deleted
}

interface EventsActions extends StoreActions {
  setEvents: (events: OwnershipEventRecord[]) => void
  addEvent: (event: OwnershipEventRecord) => void
  updateEvent: (eventId: string, updates: Partial<OwnershipEventRecord>) => void
  removeEvent: (eventId: string) => void
  fetchEvents: (options?: { limit?: number; forceRefresh?: boolean }) => Promise<void>
  refreshEvents: () => Promise<void>
  getEventById: (id: string) => OwnershipEventRecord | null
  getEventsByIds: (ids: string[]) => OwnershipEventRecord[]
  getEventsByItemId: (itemId: string) => OwnershipEventRecord[]
  getEventsByPlayerId: (playerId: string) => OwnershipEventRecord[]
  getEventsByAction: (action: OwnershipAction) => OwnershipEventRecord[]
  
  // Optimistic operations
  createEventOptimistic: (eventData: Omit<OwnershipEventRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<OwnershipEventRecord>
  deleteEventOptimistic: (eventId: string) => Promise<void>
  
  // Cascade refresh
  triggerSnapshotsRefresh: () => void
}

type EventsStore = EventsState & EventsActions

export const useEventsStore = create<EventsStore>()(
  subscribeWithSelector((set, get) => ({
    // Base state
    ...createBaseState(),
    
    // Events data
    events: [],
    eventsById: new Map(),
    optimisticEvents: new Set(),
    
    // Base actions
    ...createBaseActions<EventsState>(),
    
    // Events-specific actions
    setEvents: (events: OwnershipEventRecord[]) => {
      const eventsById = new Map<string, OwnershipEventRecord>()
      events.forEach(event => {
        eventsById.set(event.id, event)
      })
      
      set({
        events,
        eventsById,
        lastFetched: Date.now(),
        error: null,
      })
    },
    
    addEvent: (event: OwnershipEventRecord) => {
      const { events, eventsById } = get()
      const newEvents = [...events, event]
      const newEventsById = new Map(eventsById)
      newEventsById.set(event.id, event)
      
      set({
        events: newEvents,
        eventsById: newEventsById,
      })
    },
    
    updateEvent: (eventId: string, updates: Partial<OwnershipEventRecord>) => {
      const { events, eventsById } = get()
      const eventIndex = events.findIndex(e => e.id === eventId)
      
      if (eventIndex === -1) {
        return
      }
      
      const updatedEvent = { ...events[eventIndex], ...updates }
      const newEvents = [...events]
      newEvents[eventIndex] = updatedEvent
      
      const newEventsById = new Map(eventsById)
      newEventsById.set(eventId, updatedEvent)
      
      set({
        events: newEvents,
        eventsById: newEventsById,
      })
    },
    
    removeEvent: (eventId: string) => {
      const { events, eventsById } = get()
      const newEvents = events.filter(e => e.id !== eventId)
      const newEventsById = new Map(eventsById)
      newEventsById.delete(eventId)
      
      set({
        events: newEvents,
        eventsById: newEventsById,
      })
    },
    
    fetchEvents: async (options = {}) => {
      const { limit, forceRefresh = false } = options
      const state = get()
      
      // Don't fetch if already loading/refreshing
      if (state.isLoading || state.isRefreshing) {
        return
      }
      
      // Don't fetch if data is fresh and not forcing refresh
      if (!forceRefresh && !shouldRefresh(state)) {
        return
      }
      
      const isRefresh = state.events.length > 0
      
      set({
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      })
      
      try {
        const events = await fetchOwnershipEvents(limit ? { limit } : {})
        get().setEvents(events)
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
    
    refreshEvents: () => {
      return get().fetchEvents({ forceRefresh: true })
    },
    
    getEventById: (id: string) => {
      return get().eventsById.get(id) || null
    },
    
    getEventsByIds: (ids: string[]) => {
      const { eventsById } = get()
      return ids.map(id => eventsById.get(id)).filter(Boolean) as OwnershipEventRecord[]
    },
    
    getEventsByItemId: (itemId: string) => {
      const { events } = get()
      return events.filter(event => event.item_id === itemId)
    },
    
    getEventsByPlayerId: (playerId: string) => {
      const { events } = get()
      return events.filter(event => 
        event.from_player === playerId || event.to_player === playerId
      )
    },
    
    getEventsByAction: (action: OwnershipAction) => {
      const { events } = get()
      return events.filter(event => event.action === action)
    },
    
    // Optimistic operations
    createEventOptimistic: async (eventData) => {
      const tempId = `temp-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const optimisticEvent: OwnershipEventRecord = {
        ...eventData,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Add optimistic event immediately
      const { addEvent, optimisticEvents } = get()
      addEvent(optimisticEvent)
      
      const newOptimisticEvents = new Set(optimisticEvents)
      newOptimisticEvents.add(tempId)
      set({ optimisticEvents: newOptimisticEvents })
      
      try {
        const newEvent = await createOwnershipEvent(eventData)
        
        // Replace optimistic event with real event
        const { removeEvent, addEvent: addRealEvent } = get()
        removeEvent(tempId)
        addRealEvent(newEvent)
        
        // Remove from optimistic set
        const updatedOptimisticEvents = new Set(get().optimisticEvents)
        updatedOptimisticEvents.delete(tempId)
        set({ optimisticEvents: updatedOptimisticEvents })
        
        // Trigger snapshots refresh
        get().triggerSnapshotsRefresh()
        
        return newEvent
      } catch (error) {
        // Rollback optimistic update
        const { removeEvent } = get()
        removeEvent(tempId)
        
        const updatedOptimisticEvents = new Set(get().optimisticEvents)
        updatedOptimisticEvents.delete(tempId)
        set({ optimisticEvents: updatedOptimisticEvents })
        
        throw error
      }
    },
    
    deleteEventOptimistic: async (eventId: string) => {
      const { eventsById, optimisticEvents } = get()
      const event = eventsById.get(eventId)
      
      if (!event) {
        return
      }
      
      // Remove event immediately
      const { removeEvent } = get()
      removeEvent(eventId)
      
      const newOptimisticEvents = new Set(optimisticEvents)
      newOptimisticEvents.add(eventId)
      set({ optimisticEvents: newOptimisticEvents })
      
      try {
        await deleteOwnershipEvent(eventId)
        
        // Remove from optimistic set
        const updatedOptimisticEvents = new Set(get().optimisticEvents)
        updatedOptimisticEvents.delete(eventId)
        set({ optimisticEvents: updatedOptimisticEvents })
        
        // Trigger snapshots refresh
        get().triggerSnapshotsRefresh()
      } catch (error) {
        // Rollback optimistic update
        if (event) {
          const { addEvent } = get()
          addEvent(event)
        }
        
        const updatedOptimisticEvents = new Set(get().optimisticEvents)
        updatedOptimisticEvents.delete(eventId)
        set({ optimisticEvents: updatedOptimisticEvents })
        
        throw error
      }
    },
    
    // Cascade refresh
    triggerSnapshotsRefresh: () => {
      // Import snapshots store dynamically to avoid circular dependencies
      import('./snapshots-store').then(({ useSnapshotsStore }) => {
        useSnapshotsStore.getState().refreshSnapshots()
      })
    },
  }))
)

// Auto-refresh when data becomes stale
let refreshTimeout: NodeJS.Timeout | null = null

useEventsStore.subscribe(
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
        const state = useEventsStore.getState()
        if (shouldRefresh(state)) {
          state.refreshEvents()
        }
      }, timeUntilStale)
    }
  }
)

// Export selectors for common use cases
export const useEvents = () => useEventsStore((state) => state.events)
export const useEventsLoading = () => useEventsStore((state) => state.isLoading)
export const useEventsRefreshing = () => useEventsStore((state) => state.isRefreshing)
export const useEventsError = () => useEventsStore((state) => state.error)
export const useEventById = (id: string) => useEventsStore((state) => state.getEventById(id))
export const useEventsByIds = (ids: string[]) => useEventsStore((state) => state.getEventsByIds(ids))
export const useEventsByItemId = (itemId: string) => useEventsStore((state) => state.getEventsByItemId(itemId))
export const useEventsByPlayerId = (playerId: string) => useEventsStore((state) => state.getEventsByPlayerId(playerId))
export const useEventsByAction = (action: OwnershipAction) => useEventsStore((state) => state.getEventsByAction(action))
export const useOptimisticEvents = () => useEventsStore((state) => state.optimisticEvents)
