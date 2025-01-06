import { useCallback, useRef, useState } from 'react'
import { createMiniature, updateMiniature } from '../services/miniatureService'
import type { Mini } from '../types/mini'
import type { MiniatureData } from '../services/miniatureService'
import { useAuth } from '../contexts/AuthContext'

export function useOptimisticMinis() {
  const [optimisticMinis, setOptimisticMinis] = useState<Mini[]>([])
  const [error, setError] = useState<Error | null>(null)
  const optimisticIdCounter = useRef(-1)
  const { user } = useAuth()

  const handleAdd = useCallback(async (miniatureData: Partial<Mini>) => {
    if (!user?.id) {
      console.error('No user ID available for audit logging')
      throw new Error('No user ID available')
    }

    // Create a temporary ID for optimistic update
    const tempId = optimisticIdCounter.current
    optimisticIdCounter.current -= 1

    const tempMini: Mini = {
      ...miniatureData as Mini,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      in_use: null,
      painted_by: {
        id: miniatureData.painted_by_id || 0,
        painted_by_name: ''
      },
      base_sizes: {
        id: miniatureData.base_size_id || 0,
        base_size_name: ''
      },
      product_sets: miniatureData.product_set_id ? {
        id: miniatureData.product_set_id,
        name: ''
      } : undefined,
      has_image: false
    }

    try {
      // Add to optimistic state
      setOptimisticMinis(prev => [...prev, tempMini])

      // Transform data for API
      const transformedData: Partial<MiniatureData> = {
        name: miniatureData.name,
        description: miniatureData.description,
        location: miniatureData.location,
        quantity: miniatureData.quantity,
        painted_by_id: miniatureData.painted_by_id,
        base_size_id: miniatureData.base_size_id,
        product_set_id: miniatureData.product_set_id,
        material_id: miniatureData.material_id,
        types: miniatureData.types?.map(t => ({
          type_id: t.type_id,
          proxy_type: t.proxy_type
        })),
        tags: miniatureData.tags?.map(t => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      }

      // Perform API call
      const newMini = await createMiniature(transformedData, user.id)

      // Update optimistic state with real data
      setOptimisticMinis(prev =>
        prev.map(mini => mini.id === tempId ? { ...mini, id: newMini.id } : mini)
      )

      return newMini
    } catch (error) {
      // Remove failed entry from optimistic state
      setOptimisticMinis(prev => prev.filter(mini => mini.id !== tempId))
      setError(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }, [])

  const handleEdit = useCallback(async (miniId: number, miniatureData: Partial<Mini>) => {
    if (!user?.id) {
      console.error('No user ID available for audit logging')
      throw new Error('No user ID available')
    }

    try {
      // Update optimistic state
      setOptimisticMinis(prev =>
        prev.map(mini => mini.id === miniId ? { ...mini, ...miniatureData } : mini)
      )

      // Transform data for API
      const transformedData: Partial<MiniatureData> = {
        name: miniatureData.name,
        description: miniatureData.description,
        location: miniatureData.location,
        quantity: miniatureData.quantity,
        painted_by_id: miniatureData.painted_by_id,
        base_size_id: miniatureData.base_size_id,
        product_set_id: miniatureData.product_set_id,
        material_id: miniatureData.material_id,
        types: miniatureData.types?.map(t => ({
          type_id: t.type_id,
          proxy_type: t.proxy_type
        })),
        tags: miniatureData.tags?.map(t => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      }

      // Perform API call
      await updateMiniature(miniId, transformedData, user.id)
    } catch (error) {
      // Revert optimistic update on error
      setError(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }, [])

  return {
    optimisticMinis,
    error,
    handleAdd,
    handleEdit
  }
} 