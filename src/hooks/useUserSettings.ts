import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseMonitor'

export type UserSetting = {
  id: number
  setting_name: string
  setting_value: string
  created_at: string
  updated_at: string
}

interface SettingsStore {
  settings: Map<string, string>
  loading: boolean
  error: string | null
  lastFetch: number
}

let store: SettingsStore = {
  settings: new Map(),
  loading: true,
  error: null,
  lastFetch: 0
}

let storePromise: Promise<void> | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Add a subscription cleanup function
let cleanupSubscription: (() => void) | null = null

async function loadSettings() {
  try {
    store.loading = true
    store.error = null

    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_name, setting_value')

    if (error) throw error

    // Update store
    store.settings = new Map(data?.map((setting: { setting_name: string; setting_value: string }) => 
      [setting.setting_name, setting.setting_value]
    ) || [])
    store.loading = false
    store.lastFetch = Date.now()
  } catch (err) {
    store.error = err instanceof Error ? err.message : 'An error occurred'
    store.loading = false
    throw err
  }
}

export function useUserSettings() {
  const [state, setState] = useState<SettingsStore>(store)

  // Setup real-time subscription only once
  useEffect(() => {
    if (cleanupSubscription) return; // Skip if subscription already exists

    const subscription = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings'
        },
        async () => {
          // Invalidate cache and reload settings
          store.lastFetch = 0
          if (!storePromise) {
            storePromise = loadSettings().finally(() => {
              storePromise = null
              setState({ ...store })
            })
          }
        }
      )
      .subscribe()

    cleanupSubscription = () => {
      subscription.unsubscribe()
      cleanupSubscription = null
    }

    return () => {
      cleanupSubscription?.()
    }
  }, []) // Empty dependency array as we want this to run once

  useEffect(() => {
    const loadData = async () => {
      const now = Date.now()
      const needsRefresh = now - store.lastFetch > CACHE_DURATION

      if (needsRefresh || store.error || store.loading) {
        if (!storePromise) {
          storePromise = loadSettings().finally(() => {
            storePromise = null
            setState({ ...store })
          })
        } else {
          try {
            await storePromise
            setState({ ...store })
          } catch (err) {
            console.error('Error loading settings:', err)
          }
        }
      }
    }

    loadData()
  }, [])

  const getSetting = useCallback(async (name: string): Promise<string | null> => {
    // Return from cache if available and valid
    if (store.settings.has(name) && Date.now() - store.lastFetch <= CACHE_DURATION) {
      return store.settings.get(name) || null
    }

    // Load settings if cache is invalid
    if (!storePromise) {
      storePromise = loadSettings().finally(() => {
        storePromise = null
        setState({ ...store })
      })
    }

    try {
      await storePromise
      return store.settings.get(name) || null
    } catch (err) {
      console.error('Error getting setting:', err)
      return null
    }
  }, [])

  const setSetting = useCallback(async (name: string, value: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ setting_name: name, setting_value: value })

      if (error) throw error

      // Update local cache immediately
      store.settings.set(name, value)
      setState({ ...store })
    } catch (err) {
      console.error('Error setting value:', err)
      throw err
    }
  }, [])

  return {
    settings: state.settings,
    loading: state.loading,
    error: state.error,
    getSetting,
    setSetting
  }
} 