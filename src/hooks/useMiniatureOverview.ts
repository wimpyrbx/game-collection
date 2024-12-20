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

export function useMiniatureOverview(pageSize: number = 10) {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null)
  const [modalData, setModalData] = useState<{
    selectedMini: Mini | null
    windowedData: Mini[]
  } | null>(null)

  const miniCache = useRef(new CacheManager<Mini>())
  const referenceDataTimestamp = useRef<number>(0)

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const now = Date.now()
      if (now - referenceDataTimestamp.current < CACHE_DURATION && referenceData) {
        return referenceData
      }

      const [
        { data: paintedBy },
        { data: baseSizes },
        { data: companies },
        { data: productLines },
        { data: productSets },
        { data: types }
      ] = await Promise.all([
        supabase.from('painted_by').select('*').order('painted_by_name'),
        supabase.from('base_sizes').select('*').order('base_size_name'),
        supabase.from('product_companies').select('*').order('name'),
        supabase.from('product_lines').select('*').order('name'),
        supabase.from('product_sets').select('*').order('name'),
        supabase.from('mini_types')
          .select(`
            id,
            name,
            categories:type_to_categories(
              category:mini_categories(id, name)
            )
          `)
          .order('name')
      ])

      const newReferenceData = {
        paintedByOptions: paintedBy || [],
        baseSizeOptions: baseSizes || [],
        companies: companies || [],
        productLines: productLines || [],
        productSets: productSets || [],
        miniTypes: (types || []).map(type => ({
          id: type.id,
          name: type.name,
          categories: type.categories
            .filter(cat => cat?.category)
            .map(cat => ({
              id: cat.category.id,
              name: cat.category.name
            }))
        }))
      }

      referenceDataTimestamp.current = now
      setReferenceData(newReferenceData)
      return newReferenceData
    } catch (err) {
      console.error('Error loading reference data:', err)
      throw err
    }
  }, [referenceData])

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

      const { data, count, error } = await query

      if (error) throw error

      const transformedData = data?.map(item => ({
        ...item,
        types: item.types?.map(t => ({
          ...t,
          type: {
            ...t.type,
            categories: t.type.categories?.map(c => c.category) || []
          }
        })) || []
      })) || []

      miniCache.current.set(page, search, transformedData, count || 0)

      return {
        data: transformedData,
        totalCount: count || 0,
        page,
        searchTerm: search
      }
    } catch (err) {
      console.error('Error loading page data:', err)
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
        selectedMini,
        windowedData: windowedData || []
      })

      return { selectedMini, windowedData }
    } catch (err) {
      console.error('Error loading modal data:', err)
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
    let mounted = true
    let subscription: any

    const initialize = async () => {
      try {
        setLoading(true)
        await loadReferenceData()
        const { data, totalCount } = await loadPageData(currentPage, searchTerm)
        
        if (mounted) {
          setMinis(data)
          setTotalCount(totalCount)
          setError(null)
          
          // Set up real-time subscription for changes
          subscription = supabase
            .channel('miniature_changes')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'minis' },
              async (payload) => {
                // Immediately clear cache on any change
                miniCache.current.clear()

                if (payload.eventType === 'DELETE') {
                  // For deletions, update the UI immediately
                  setMinis(prev => prev.filter(mini => mini.id !== payload.old.id))
                  setTotalCount(prev => Math.max(0, prev - 1))
                } else {
                  // For other changes, reload the current page
                  try {
                    const { data: newData, totalCount: newTotal } = await loadPageData(currentPage, searchTerm, true)
                    if (mounted) {
                      setMinis(newData)
                      setTotalCount(newTotal)
                    }
                  } catch (err) {
                    console.error('Error reloading after change:', err)
                  }
                }
              }
            )
            .subscribe()
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()
    
    return () => {
      mounted = false
      subscription?.unsubscribe()
      debouncedSearch.cancel()
    }
  }, [currentPage, searchTerm, loadPageData, loadReferenceData, debouncedSearch])

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