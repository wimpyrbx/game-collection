import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Mini } from '../types/mini'

interface SupabaseMiniType {
  mini_id: number
  type_id: number
  proxy_type: boolean
  type: {
    id: number
    name: string
    categories: Array<{
      category: {
        id: number
        name: string
      }
    }>
  }
}

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
  in_use: string | null
  types: SupabaseMiniType[]
  painted_by: {
    id: number
    painted_by_name: string
  }
  base_sizes: {
    id: number
    base_size_name: string
  }
  product_sets?: {
    id: number
    name: string
    product_line?: {
      id: number
      name: string
      company?: {
        id: number
        name: string
      }
    }
  }
  tags?: {
    tag: {
      id: number
      name: string
    }
  }[]
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
  const [currentPage, setCurrentPage] = useState(page)

  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page)
    }
  }, [page])

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
    in_use: item.in_use,
    types: item.types?.map((t: SupabaseMiniType) => ({
      mini_id: t.mini_id,
      type_id: t.type_id,
      proxy_type: t.proxy_type,
      type: {
        id: t.type.id,
        name: t.type.name,
        categories: t.type.categories.map(c => ({
          category: {
            id: c.category.id,
            name: c.category.name
          }
        }))
      }
    })) || [],
    painted_by: item.painted_by,
    base_sizes: item.base_sizes,
    product_sets: item.product_sets,
    tags: item.tags?.map(t => ({
      tag: {
        id: t.tag.id,
        name: t.tag.name
      }
    })) || []
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

  const getPageMinis = async (pageNum: number): Promise<Mini[]> => {
    try {
      const startRow = (pageNum - 1) * pageSize
      const endRow = startRow + pageSize - 1

      const query = supabase
        .from('minis')
        .select(`
          *,
          painted_by:painted_by_id(
            id,
            painted_by_name
          ),
          base_sizes:base_size_id(
            id,
            base_size_name
          ),
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
          product_sets:product_set_id(
            id,
            name,
            product_line:product_line_id(
              id,
              name,
              company:company_id(
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

      if (searchTerm) {
        query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query
        .returns<Array<SupabaseMini>>()
        .range(startRow, endRow)
        .order('name')

      if (error) {
        console.error('Error fetching minis:', error)
        return []
      }

      return data ? data.map((mini: SupabaseMini) => transformMini(mini)) : []
    } catch (error) {
      console.error('Error in getPageMinis:', error)
      return []
    }
  }

  const getAllMinis = async (): Promise<Mini[]> => {
    try {
      const query = supabase
        .from('minis')
        .select(`
          *,
          painted_by:painted_by_id(
            id,
            painted_by_name
          ),
          base_sizes:base_size_id(
            id,
            base_size_name
          ),
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
          product_sets:product_set_id(
            id,
            name,
            product_line:product_line_id(
              id,
              name,
              company:company_id(
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

      if (searchTerm) {
        query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query
        .returns<Array<SupabaseMini>>()
        .order('name')

      if (error) {
        console.error('Error fetching all minis:', error)
        return []
      }

      return data ? data.map((mini: SupabaseMini) => transformMini(mini)) : []
    } catch (error) {
      console.error('Error in getAllMinis:', error)
      return []
    }
  }

  useEffect(() => {
    const loadMinis = async () => {
      try {
        setLoading(true)
        setError(null)

        // First get the total count with a proper count query
        const countQuery = supabase
          .from('minis')
          .select('*', { count: 'exact', head: true })

        if (searchTerm) {
          countQuery.ilike('name', `%${searchTerm}%`)
        }

        const { count, error: countError } = await countQuery

        if (countError) throw countError
        setTotalMinis(count || 0)

        // Calculate valid page number
        const maxPage = Math.max(1, Math.ceil((count || 0) / pageSize))
        const validPage = Math.min(currentPage, maxPage)

        // If requested page is beyond max, adjust current page
        if (currentPage > maxPage) {
          setCurrentPage(maxPage)
          return
        }

        const startRow = (validPage - 1) * pageSize

        const query = supabase
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
            in_use,
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
            base_sizes:base_size_id(
              id,
              base_size_name
            ),
            product_sets:product_set_id(
              id,
              name,
              product_line:product_line_id(
                id,
                name,
                company:company_id(
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

        if (searchTerm) {
          query.ilike('name', `%${searchTerm}%`)
        }

        const { data, error } = await query
          .returns<Array<SupabaseMini>>()
          .range(startRow, startRow + pageSize - 1)
          .order('name')

        if (error) throw error

        const transformedData = data?.map((item: SupabaseMini) => transformMini(item)) || []

        setMinis(transformedData)
        await getTotalQuantity()
      } catch (err) {
        console.error('Error loading minis:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadMinis()
  }, [currentPage, pageSize, searchTerm, getTotalQuantity])

  return { 
    minis, 
    loading, 
    error, 
    totalMinis, 
    totalQuantity, 
    getPageMinis,
    getAllMinis, 
    setMinis, 
    getTotalQuantity,
    currentPage,
    setCurrentPage
  }
} 