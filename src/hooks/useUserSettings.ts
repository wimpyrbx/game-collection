import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type UserSetting = {
  id: number
  setting_name: string
  setting_value: string
  created_at: string
  updated_at: string
}

export function useUserSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getSetting = async (settingName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('setting_value')
        .eq('setting_name', settingName)
        .single()

      if (error) throw error
      return data?.setting_value || null
    } catch (err) {
      console.error('Error fetching setting:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }

  const setSetting = async (settingName: string, settingValue: string): Promise<void> => {
    try {
      // First try to update
      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({ 
          setting_value: settingValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_name', settingName)
        .select()

      // If no rows were updated, insert instead
      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            setting_name: settingName,
            setting_value: settingValue
          })

        if (insertError) throw insertError
      }

      if (updateError) throw updateError
    } catch (err) {
      console.error('Error saving setting:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return {
    isLoading,
    error,
    getSetting,
    setSetting
  }
} 