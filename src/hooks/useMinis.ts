import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Mini } from '../types/mini'

interface SupabaseMini {
  id: number
  name: string
  description: string | null
  location: string
  quantity: number
  created_at: string
  updated_at: string
  painted_by_id: number
  base_size_id: number
  product_set_id: number | null
  types?: Array<{
    mini_id: number
    type_id: number
    proxy_type: boolean
    type: {
      id: number
      name: string
      categories: Array<{
        category: Array<{
          id: number
          name: string
        }>
      }>
    }
  }>
  painted_by: {
    id: number
    painted_by_name: string
  }
  base_size: {
    id: number
    base_size_name: string
  }
  product_set?: {
    id: number
    name: string
    product_lines?: {
      id: number
      name: string
      product_companies?: {
        id: number
        name: string
      }
    }
  }
}

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

  const transformMini = (item: SupabaseMini): Mini => ({
    id: item.id,
    name: item.name,
    description: item.description,
    location: item.location,
    quantity: item.quantity,
    created_at: item.created_at,
    updated_at: item.updated_at,
    painted_by_id: item.painted_by_id,
    base_size_id: item.base_size_id,
    product_set_id: item.product_set_id,
    types: item.types?.map(t => ({
      mini_id: item.id,
      type_id: t.type.id,
      proxy_type: t.proxy_type,
      type: {
        id: t.type.id,
        name: t.type.name,
        categories: t.type.categories?.map(c => c.category) || []
      }
    })) || [],
    painted_by: item.painted_by,
    base_size: item.base_size,
    product_set: item.product_set
  })

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

  const getPageMinis = async (pageNum: number): Promise<Mini[] | null> => {
    try {
      const startRow = pageNum * pageSize
      const endRow = startRow + pageSize - 1

      const { data, error } = await supabase
        .from('minis')
        .select(`
          *,
          painted_by:painted_by_id(
            id,
            painted_by_name
          ),
          base_size:base_size_id(
            id,
            base_size_name
          ),
          types:mini_to_types(
            type:type_id(
              id,
              name,
              categories:type_to_categories(
                category:category_id(
                  id,
                  name
                )
              )
            ),
            proxy_type
          ),
          product_set:product_set_id(
            id,
            name,
            product_lines(
              id,
              name,
              product_companies(
                id,
                name
              )
            )
          ),
          tags:mini_to_tags(
            tag:tags(
              id,
              name
            )
          )
        `)
        .range(startRow, endRow)
        .order('name')

      if (error) {
        console.error('Error fetching minis:', error)
        return null
      }

      // Transform the data structure
      if (data) {
        return data.map(mini => ({
          ...mini,
          base_size: mini.base_size || (mini.base_size_id ? {
            id: mini.base_size_id,
            base_size_name: 'Loading...'
          } : null),
          product_set: mini.product_set || (mini.product_set_id ? {
            id: mini.product_set_id,
            name: 'Loading...',
            product_lines: {
              id: 0,
              name: 'Loading...',
              product_companies: {
                id: 0,
                name: 'Loading...'
              }
            }
          } : null),
          painted_by: mini.painted_by,
          types: mini.types?.map(t => ({
            ...t,
            type: {
              ...t.type,
              categories: t.type.categories?.map(c => c.category)
            }
          })),
          tags: mini.tags?.map(tagRel => tagRel.tag) || []
        }))
      }

      return null
    } catch (error) {
      console.error('Error in getPageMinis:', error)
      return null
    }
  }

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
            painted_by_id,
            base_size_id,
            product_set_id,
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
            base_size:base_size_id(
              id,
              base_size_name
            ),
            product_set:product_set_id(
              id,
              name,
              product_lines(
                id,
                name,
                product_companies(
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

        const transformedData = data?.map(item => transformMini(item as SupabaseMini)) || []

        setMinis(transformedData)
        setTotalMinis(count || 0)

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