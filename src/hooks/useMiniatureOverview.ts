import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseMonitor'
import type { Mini } from '../types/mini'
import debounce from 'lodash/debounce'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const SEARCH_DEBOUNCE = 500 // 500ms debounce for search
const WINDOW_SIZE = 10 // Number of items to load before/after current item in modal

interface CacheEntry<T> {
  data: T[]
  totalCount: number
  timestamp: number
  searchTerm: string | null
  page: number
}

class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>()
  
  getCacheKey(page: number, searchTerm: string | null): string {
    return `${page}-${searchTerm || ''}`
  }
  
  isValid(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < CACHE_DURATION
  }
  
  get(page: number, searchTerm: string | null): CacheEntry<T> | null {
    const key = this.getCacheKey(page, searchTerm)
    const entry = this.cache.get(key)
    return entry && this.isValid(entry) ? entry : null
  }
  
  set(page: number, searchTerm: string | null, data: T[], totalCount: number): void {
    const key = this.getCacheKey(page, searchTerm)
    this.cache.set(key, {
      data,
      totalCount,
      timestamp: Date.now(),
      searchTerm,
      page
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Optimized query that includes all necessary relations
const MINIATURE_QUERY = `
  id,
  name,
  description,
  quantity,
  location,
  created_at,
  updated_at,
  painted_by:painted_by_id(id, painted_by_name),
  base_size:base_size_id(id, base_size_name),
  product_set:product_set_id(
    id,
    name,
    product_line:product_line_id(
      id,
      name,
      company:company_id(id, name)
    )
  ),
  types:mini_to_types(
    mini_id,
    type_id,
    proxy_type,
    type:mini_types(
      id,
      name,
      categories:type_to_categories(
        category:mini_categories(id, name)
      )
    )
  ),
  tags:mini_to_tags(tag:tags(id, name))
`

// Reference data types
interface ReferenceData {
  paintedByOptions: Array<{ id: number; painted_by_name: string }>
  baseSizeOptions: Array<{ id: number; base_size_name: string }>
  companies: Array<{ id: number; name: string }>
  productLines: Array<{ id: number; name: string; company_id: number }>
  productSets: Array<{ id: number; name: string; product_line_id: number }>
  miniTypes: Array<{
    id: number
    name: string
    categories: Array<{ id: number; name: string }>
  }>
}


const transformData = (rawItem: any): Mini => ({
  id: rawItem.id,
  name: rawItem.name,
  description: rawItem.description,
  location: rawItem.location,
  quantity: rawItem.quantity,
  created_at: rawItem.created_at,
  updated_at: rawItem.updated_at,
  painted_by_id: rawItem.painted_by.id,
  base_size_id: rawItem.base_size.id,
  product_set_id: rawItem.product_set?.id || null,
  in_use: rawItem.in_use,
  painted_by: rawItem.painted_by,
  base_sizes: rawItem.base_size,
  product_sets: rawItem.product_set,
  types: rawItem.types.map((t: any) => ({
    mini_id: t.mini_id,
    type_id: t.type_id,
    proxy_type: t.proxy_type,
    type: {
      id: t.type.id,
      name: t.type.name,
      categories: t.type.categories.map((c: any) => c.category)
    }
  })),
  tags: (rawItem.tags || []).map((t: any) => ({ tag: t.tag }))
})

// Add development mode check
const isDevelopment = import.meta.env.DEV

// Update error logging to only show in development
const logError = (message: string, error: unknown) => {
  if (isDevelopment) {
    console.error(message, error)
  }
}

export function useMiniatureOverview(pageSize: number = 10) {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading] = useState(true)
  const [error] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [referenceData] = useState<ReferenceData | null>(null)
  const [modalData, setModalData] = useState<{
    selectedMini: Mini | null
    windowedData: Mini[]
  } | null>(null)

  const miniCache = useRef(new CacheManager<Mini>())
  const referenceDataTimestamp = useRef<number>(0)

  // Load reference data

  // Load page data with caching
  const loadPageData = useCallback(async (
    page: number,
    search: string | null = null,
    forceRefresh: boolean = false
  ) => {
    try {
      const cachedData = !forceRefresh && miniCache.current.get(page, search)
      if (cachedData) {
        return cachedData
      }

      let query = supabase
        .from('minis')
        .select(MINIATURE_QUERY, { count: 'exact' })
        .order('name')

      if (search?.trim()) {
        query = query.ilike('name', `%${search.trim()}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query as unknown as {
        data: Array<{
          id: number
          name: string
          description: string | null
          location: string
          quantity: number
          created_at: string
          updated_at: string
          in_use: string | null
          painted_by: { id: number; painted_by_name: string }
          base_size: { id: number; base_size_name: string }
          product_set?: {
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
          types: Array<{
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
          }>
          tags?: Array<{
            tag: {
              id: number
              name: string
            }
          }>
        }>
        count: number
        error: any
      }

      if (error) throw error

      const transformedData = (data || []).map(transformData)
      miniCache.current.set(page, search, transformedData, count || 0)

      return {
        data: transformedData,
        totalCount: count || 0,
        page,
        searchTerm: search
      }
    } catch (err) {
      logError('Error loading page data:', err)
      throw err
    }
  }, [pageSize])

  // Preload adjacent pages
  const preloadAdjacentPages = useCallback(async (
    currentPage: number,
    searchTerm: string | null
  ) => {
    const pagesToPreload = [currentPage - 1, currentPage + 1]
      .filter(page => page > 0)
      .filter(page => !miniCache.current.get(page, searchTerm))

    return Promise.all(
      pagesToPreload.map(page =>
        loadPageData(page, searchTerm)
          .catch(err => console.error(`Error preloading page ${page}:`, err))
      )
    )
  }, [loadPageData])

  // Load modal data with windowing
  const loadModalData = useCallback(async (
    selectedId: number,
    selectedIndex: number
  ) => {
    try {
      const { data: selectedMini } = await supabase
        .from('minis')
        .select(MINIATURE_QUERY)
        .eq('id', selectedId)
        .single()

      const { data: windowedData } = await supabase
        .from('minis')
        .select(MINIATURE_QUERY)
        .order('name')
        .range(
          Math.max(0, selectedIndex - WINDOW_SIZE),
          selectedIndex + WINDOW_SIZE
        )

      setModalData({
        selectedMini: selectedMini ? transformData(selectedMini) : null,
        windowedData: (windowedData || []).map(transformData)
      })

      return { selectedMini, windowedData }
    } catch (err) {
      logError('Error loading modal data:', err)
      throw err
    }
  }, [])

  // Handle search with debounce
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term)
      setCurrentPage(1)
      miniCache.current.clear()
    }, SEARCH_DEBOUNCE),
    []
  )

  // Effect to load initial data and set up subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('minis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minis'
        },
        () => {
          // Invalidate cache and refresh data
          miniCache.current.clear()
          loadPageData(currentPage, searchTerm, true)
            .then(({ data, totalCount }) => {
              setMinis(data)
              setTotalCount(totalCount)
            })
            .catch(err => {
              logError('Error refreshing data after change:', err)
            })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentPage, searchTerm, loadPageData])

  // Preload adjacent pages when current page changes
  useEffect(() => {
    if (!loading) {
      preloadAdjacentPages(currentPage, searchTerm)
    }
  }, [currentPage, searchTerm, loading, preloadAdjacentPages])

  return {
    minis,
    loading,
    error,
    currentPage,
    setCurrentPage,
    totalCount,
    searchTerm,
    setSearchTerm: debouncedSearch,
    referenceData,
    modalData,
    loadModalData,
    refreshData: () => {
      miniCache.current.clear()
      referenceDataTimestamp.current = 0
      return loadPageData(currentPage, searchTerm, true)
    }
  }
} 