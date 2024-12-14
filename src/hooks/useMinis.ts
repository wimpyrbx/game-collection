import { useState, useEffect } from 'react'
import { useMiniAdmin } from './useMiniAdmin'
import type { Mini } from '../types/mini'

export function useMinis() {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { loadMinis } = useMiniAdmin()

  useEffect(() => {
    const fetchMinis = async () => {
      try {
        setLoading(true)
        const result = await loadMinis(0, 100)
        if (result.error) {
          throw result.error
        }
        setMinis(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMinis()
  }, [loadMinis])

  return { minis, loading, error }
} 