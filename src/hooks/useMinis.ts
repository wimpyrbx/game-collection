import { useState, useEffect, useCallback } from 'react'
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
  const [totalQuantity, setTotalQuantity] = useState(0)

  const getTotalQuantity = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('minis')
        .select('quantity')
        .returns<{ quantity: number }[]>()

      if (error) throw error

      const sum = data.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
      setTotalQuantity(sum)
    } catch (err) {
      console.error('Error loading total quantity:', err)
    }
  }, [])

  const getPageMinis = useCallback(async (pageNum: number): Promise<Mini[] | null> => {
    try {
      let query = supabase
        .from('minis')
        .select(`
          id,
          name,
          description,
          quantity,
          location,
          created_at,
          updated_at,
          types:mini_to_types(
            mini_id,
            type_id,
            proxy_type,
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
        `)

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query
        .range((pageNum - 1) * pageSize, pageNum * pageSize - 1)
        .order('name')

      if (error) throw error

      return data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        location: item.location,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        painted_by_id: item.painted_by?.[0]?.id || 0,
        base_size_id: item.base_sizes?.[0]?.id || 0,
        product_set_id: item.product_sets?.[0]?.id || null, 
        types: item.types?.map(t => ({
          type: t.type[0],
          proxy_type: t.proxy_type
        })) || [],
        painted_by: item.painted_by?.[0],
        base_size: item.base_sizes?.[0],
        product_set: item.product_sets?.[0]
      })) || null
    } catch (err) {
      console.error('Error loading minis:', err)
      return null
    }
  }, [pageSize, searchTerm])

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
            description,
            quantity,
            location,
            created_at,
            updated_at,
            types:mini_to_types(
              mini_id,
              type_id,
              proxy_type,
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
          query = query.ilike('name', `%${searchTerm}%`)
        }

        const { data, error, count } = await query
          .range((page - 1) * pageSize, page * pageSize - 1)
          .order('name')

        if (error) throw error

        setMinis(data || [])
        setTotalMinis(count || 0)

        // Load total quantity
        await getTotalQuantity()
      } catch (err) {
        console.error('Error loading minis:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadMinis()
  }, [page, pageSize, searchTerm, getTotalQuantity])

  return { minis, loading, error, totalMinis, totalQuantity, getPageMinis, setMinis, getTotalQuantity }
} 