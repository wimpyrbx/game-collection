import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Mini } from '../types/mini'

export function useMinis(
  page: number = 1,
  pageSize: number = 10,
  searchTerm: string = ''
) {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalMinis, setTotalMinis] = useState(0)

  useEffect(() => {
    const loadMinis = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('minis')
          .select(`
            id,
            name,
            quantity,
            location,
            types:mini_to_types(
              type:mini_types(
                id,
                name,
                categories:type_to_categories(
                  category:mini_categories(
                    id,
                    name
                  )
                )
              )
            ),
            painted_by(
              id, 
              painted_by_name
            ),
            base_sizes(
              id, 
              base_size_name
            ),
            product_sets(
              id,
              name,
              product_lines(
                id,
                name,
                company:product_companies(
                  id,
                  name
                )
              )
            )
          `, { count: 'exact' })

        if (searchTerm) {
          query = query.or(`
            name.ilike.%${searchTerm}%,
            types.type.name.ilike.%${searchTerm}%,
            product_sets.name.ilike.%${searchTerm}%,
            product_sets.product_lines.name.ilike.%${searchTerm}%,
            product_sets.product_lines.company.name.ilike.%${searchTerm}%
          `)
        }

        const { data, error, count } = await query
          .range((page - 1) * pageSize, page * pageSize - 1)
          .order('name')

        if (error) throw error

        setMinis(data || [])
        setTotalMinis(count || 0)
      } catch (err) {
        console.error('Error loading minis:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadMinis()
  }, [page, pageSize, searchTerm])

  return { minis, loading, error, totalMinis }
} 