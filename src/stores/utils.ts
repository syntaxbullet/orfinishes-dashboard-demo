/**
 * Shared utilities for Zustand stores
 * Provides common patterns for loading states, error handling, and stale data management
 */

export interface StoreState {
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastFetched: number | null
}

export interface StoreActions {
  setLoading: (loading: boolean) => void
  setRefreshing: (refreshing: boolean) => void
  setError: (error: string | null) => void
  setLastFetched: (timestamp: number) => void
  clearError: () => void
}

/**
 * Check if data is stale based on last fetched timestamp
 * @param lastFetched - Timestamp when data was last fetched
 * @param staleTimeMs - Time in milliseconds before data is considered stale (default: 5 minutes)
 * @returns true if data is stale
 */
export function isDataStale(lastFetched: number | null, staleTimeMs: number = 5 * 60 * 1000): boolean {
  if (!lastFetched) {
    return true
  }
  return Date.now() - lastFetched > staleTimeMs
}

/**
 * Check if data should be refreshed (stale and not currently loading)
 * @param state - Store state
 * @param staleTimeMs - Time in milliseconds before data is considered stale
 * @returns true if data should be refreshed
 */
export function shouldRefresh(state: StoreState, staleTimeMs: number = 5 * 60 * 1000): boolean {
  return isDataStale(state.lastFetched, staleTimeMs) && !state.isLoading && !state.isRefreshing
}

/**
 * Create base store state with common loading/error fields
 */
export function createBaseState(): StoreState {
  return {
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastFetched: null,
  }
}

/**
 * Create base store actions for common state updates
 */
export function createBaseActions<T extends StoreState>(): StoreActions {
  return {
    setLoading: (loading: boolean) => (state: T) => ({ ...state, isLoading: loading }),
    setRefreshing: (refreshing: boolean) => (state: T) => ({ ...state, isRefreshing: refreshing }),
    setError: (error: string | null) => (state: T) => ({ ...state, error }),
    setLastFetched: (timestamp: number) => (state: T) => ({ ...state, lastFetched: timestamp }),
    clearError: () => (state: T) => ({ ...state, error: null }),
  }
}

/**
 * Generic error handler for store operations
 */
export function handleStoreError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

/**
 * Debounce utility for preventing rapid successive calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}
