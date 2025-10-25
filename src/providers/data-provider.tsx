/**
 * DataProvider - App-level data preloading and initialization
 * Preloads Players and Cosmetics on app mount for instant page transitions
 */

import * as React from 'react'
import { usePlayersStore } from '@/stores/players-store'
import { useCosmeticsStore } from '@/stores/cosmetics-store'

interface DataProviderProps {
  children: React.ReactNode
}

interface DataProviderState {
  isInitializing: boolean
  initializationError: string | null
  playersLoaded: boolean
  cosmeticsLoaded: boolean
}

export function DataProvider({ children }: DataProviderProps) {
  const [state, setState] = React.useState<DataProviderState>({
    isInitializing: true,
    initializationError: null,
    playersLoaded: false,
    cosmeticsLoaded: false,
  })

  const playersStore = usePlayersStore()
  const cosmeticsStore = useCosmeticsStore()

  // Initialize data on mount
  React.useEffect(() => {
    let isCancelled = false

    const initializeData = async () => {
      try {
        setState(prev => ({ ...prev, isInitializing: true, initializationError: null }))

        // Preload players and cosmetics in parallel
        const [playersResult, cosmeticsResult] = await Promise.allSettled([
          playersStore.fetchPlayers({ includeBanned: true }),
          cosmeticsStore.fetchCosmetics(),
        ])

        if (isCancelled) {
          return
        }

        // Check for errors
        const playersError = playersResult.status === 'rejected' ? playersResult.reason : null
        const cosmeticsError = cosmeticsResult.status === 'rejected' ? cosmeticsResult.reason : null

        if (playersError || cosmeticsError) {
          const errorMessage = [
            playersError ? `Players: ${playersError}` : null,
            cosmeticsError ? `Cosmetics: ${cosmeticsError}` : null,
          ].filter(Boolean).join(', ')

          setState(prev => ({
            ...prev,
            isInitializing: false,
            initializationError: errorMessage,
            playersLoaded: playersResult.status === 'fulfilled',
            cosmeticsLoaded: cosmeticsResult.status === 'fulfilled',
          }))
        } else {
          setState(prev => ({
            ...prev,
            isInitializing: false,
            initializationError: null,
            playersLoaded: true,
            cosmeticsLoaded: true,
          }))
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        setState(prev => ({
          ...prev,
          isInitializing: false,
          initializationError: error instanceof Error ? error.message : 'Failed to initialize data',
        }))
      }
    }

    void initializeData()

    return () => {
      isCancelled = true
    }
  }, [playersStore, cosmeticsStore])

  // Retry initialization on error
  const retryInitialization = React.useCallback(() => {
    setState(prev => ({ ...prev, initializationError: null }))
    // Trigger re-initialization by updating dependencies
    void playersStore.refreshPlayers()
    void cosmeticsStore.refreshCosmetics()
  }, [playersStore, cosmeticsStore])

  // Provide initialization state to children
  const contextValue = React.useMemo(() => ({
    ...state,
    retryInitialization,
    isDataReady: state.playersLoaded && state.cosmeticsLoaded,
  }), [state, retryInitialization])

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  )
}

// Context for accessing initialization state
interface DataContextValue extends DataProviderState {
  retryInitialization: () => void
  isDataReady: boolean
}

const DataContext = React.createContext<DataContextValue | null>(null)

export function useDataProvider() {
  const context = React.useContext(DataContext)
  if (!context) {
    throw new Error('useDataProvider must be used within a DataProvider')
  }
  return context
}

// Hook for checking if core data is ready
export function useIsDataReady() {
  const { isDataReady } = useDataProvider()
  return isDataReady
}

// Hook for getting initialization state
export function useInitializationState() {
  const { isInitializing, initializationError, playersLoaded, cosmeticsLoaded } = useDataProvider()
  return {
    isInitializing,
    initializationError,
    playersLoaded,
    cosmeticsLoaded,
  }
}
