/**
 * Generic hook for managing data loading states, error handling, and refresh logic.
 * Consolidates common patterns used across all page components.
 */

import * as React from "react"

export interface DataLoaderOptions {
  /** Whether to automatically load data on mount. Defaults to true. */
  autoLoad?: boolean
  /** Initial loading state. Defaults to true if autoLoad is true, false otherwise. */
  initialLoading?: boolean
}

export interface DataLoaderState<T> {
  /** Current data value */
  data: T | null
  /** Whether initial load is in progress */
  isLoading: boolean
  /** Whether a refresh is in progress */
  isRefreshing: boolean
  /** Current error message, if any */
  error: string | null
}

export interface DataLoaderActions {
  /** Load data (initial load) */
  load: (options?: { forceRefresh?: boolean }) => Promise<void>
  /** Refresh data (soft reload) */
  refresh: () => Promise<void>
  /** Clear current error */
  clearError: () => void
  /** Reset all state */
  reset: () => void
}

export type DataLoaderReturn<T> = DataLoaderState<T> & DataLoaderActions

/**
 * Generic hook for managing data loading states and operations.
 * 
 * @param fetcher - Function that returns a promise with the data to load
 * @param options - Configuration options for the loader
 * @returns Object containing state and actions for data management
 */
export function useDataLoader<T>(
  fetcher: () => Promise<T>,
  options: DataLoaderOptions = {}
): DataLoaderReturn<T> {
  const { autoLoad = true, initialLoading = autoLoad } = options

  const fetcherRef = React.useRef(fetcher)
  fetcherRef.current = fetcher

  const [data, setData] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(initialLoading)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async (loadOptions?: { forceRefresh?: boolean }) => {
    const isRefresh = loadOptions?.forceRefresh ?? false

    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const result = await fetcherRef.current()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to load data"
      setError(errorMessage)
    } finally {
      if (isRefresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  const refresh = React.useCallback(() => {
    return loadData({ forceRefresh: true })
  }, [loadData])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const reset = React.useCallback(() => {
    setData(null)
    setIsLoading(false)
    setIsRefreshing(false)
    setError(null)
  }, [])

  // Auto-load on mount if enabled
  React.useEffect(() => {
    if (autoLoad) {
      void loadData()
    }
  }, [autoLoad, loadData])

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    load: loadData,
    refresh,
    clearError,
    reset,
  }
}
