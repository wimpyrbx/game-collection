import { useState, useEffect } from 'react'
import { useUserSettings } from './useUserSettings'

export type ViewMode = 'table' | 'cards'

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { getSetting, setSetting } = useUserSettings()

  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const savedMode = await getSetting('viewType')
        setViewMode(savedMode as ViewMode || 'table')
      } catch (error) {
        console.error('Error loading view mode:', error)
        setViewMode('table') // Fallback to table view
      } finally {
        setIsLoading(false)
      }
    }

    loadViewMode()
  }, [getSetting])

  const updateViewMode = async (newMode: ViewMode) => {
    try {
      await setSetting('viewType', newMode)
      setViewMode(newMode)
    } catch (error) {
      console.error('Error saving view mode:', error)
    }
  }

  return {
    viewMode,
    setViewMode: updateViewMode,
    isLoading
  }
} 