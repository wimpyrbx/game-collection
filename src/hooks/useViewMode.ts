import { useState, useEffect, useCallback } from 'react'
import { useUserSettings } from './useUserSettings'

export type ViewMode = 'table' | 'grid' | 'dice'

// Keep a global cache of the view mode
let cachedViewMode: ViewMode | null = null

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode | null>(cachedViewMode)
  const [isLoading, setIsLoading] = useState(cachedViewMode === null)
  const { getSetting, setSetting } = useUserSettings()

  // Load view mode only once on mount
  useEffect(() => {
    let isMounted = true

    const loadViewMode = async () => {
      // If we have a cached value, use it
      if (cachedViewMode !== null) {
        if (isMounted) {
          setViewMode(cachedViewMode)
          setIsLoading(false)
        }
        return
      }

      try {
        const savedMode = await getSetting('viewType')
        const mode = (savedMode as ViewMode) || 'table'
        
        if (isMounted) {
          setViewMode(mode)
          setIsLoading(false)
          cachedViewMode = mode
        }
      } catch (error) {
        console.error('Error loading view mode:', error)
        if (isMounted) {
          setViewMode('table')
          setIsLoading(false)
          cachedViewMode = 'table'
        }
      }
    }

    loadViewMode()

    return () => {
      isMounted = false
    }
  }, []) // Remove getSetting from dependencies

  const updateViewMode = useCallback(async (newMode: ViewMode) => {
    if (newMode === viewMode) return // Don't update if mode hasn't changed
    
    try {
      await setSetting('viewType', newMode)
      setViewMode(newMode)
      cachedViewMode = newMode
    } catch (error) {
      console.error('Error saving view mode:', error)
    }
  }, [viewMode, setSetting])

  return {
    viewMode,
    setViewMode: updateViewMode,
    isLoading
  }
} 