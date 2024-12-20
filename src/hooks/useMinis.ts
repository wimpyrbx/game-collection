import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseMonitor'
import type { Mini } from '../types/mini'
import debounce from 'lodash/debounce'

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

interface Cache {
  minis: SupabaseMini[]
  totalQuantity: number
  timestamp: number
  searchTerm: string | null
}

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

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const SEARCH_DEBOUNCE = 500 // 500ms debounce for search

let globalCache: Cache | null = null
let globalCachePromise: Promise<any> | null = null

export function useMinis(pageSize: number = 10, searchTerm?: string | null) {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMinis, setTotalMinis] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [internalSearchTerm, setInternalSearchTerm] = useState<string | null>(searchTerm || null)

  // Add refs for tracking state and timeouts
  const currentPageRef = useRef(currentPage)
  const subscriptionRef = useRef<(() => void) | null>(null)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update currentPageRef when page changes
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  const isCacheValid = useCallback(() => {
    if (!globalCache) return false
    
    // Cache is invalid if it's older than CACHE_DURATION
    if (Date.now() - globalCache.timestamp > CACHE_DURATION) return false
    
    // Cache is invalid if search terms don't match
    if (globalCache.searchTerm !== internalSearchTerm) return false
    
    return true
  }, [internalSearchTerm])

  const fetchAllData = useCallback(async () => {
    try {
      // Always fetch fresh data for pagination changes
      const { data, error } = await supabase
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
        .returns<Array<SupabaseMini>>()
        .order('name')

      if (error) throw error

      // Filter data if there's a search term
      let filteredData = data || []
      if (internalSearchTerm) {
        filteredData = filteredData.filter(mini => 
          mini.name.toLowerCase().includes(internalSearchTerm.toLowerCase())
        )
      }

      // Calculate total quantity
      const totalQuantitySum = filteredData.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

      // Update global cache
      globalCache = {
        minis: filteredData,
        totalQuantity: totalQuantitySum,
        timestamp: Date.now(),
        searchTerm: internalSearchTerm
      }

      return {
        data: filteredData,
        totalQuantity: totalQuantitySum,
        totalCount: filteredData.length
      }

    } catch (error) {
      console.error('Error fetching all data:', error)
      throw error
    }
  }, [internalSearchTerm])

  // Add updateFromCache function
  const updateFromCache = useCallback((page: number) => {
    if (!globalCache) return false

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const pageData = globalCache.minis.slice(startIndex, endIndex)

    // Update state with cached data
    setMinis(pageData.map(mini => transformMini(mini)))
    setTotalMinis(globalCache.minis.length)
    setTotalQuantity(globalCache.totalQuantity)
    return true
  }, [pageSize])

  // Add loadData function
  const loadData = useCallback(async () => {
    try {
      console.log('Loading data for page:', currentPage, 'pageSize:', pageSize)
      setLoading(true)
      setError(null)

      // Try to use cache first
      if (isCacheValid()) {
        console.log('Using cache')
        const startIndex = (currentPage - 1) * pageSize
        const endIndex = Math.min(startIndex + pageSize, globalCache!.minis.length)
        const pageData = globalCache!.minis.slice(startIndex, endIndex)
        
        setMinis(pageData.map(mini => transformMini(mini)))
        setTotalMinis(globalCache!.minis.length)
        setTotalQuantity(globalCache!.totalQuantity)
        setLoading(false)
        return
      }

      console.log('Cache invalid, fetching fresh data')
      const { data, totalQuantity, totalCount } = await fetchAllData()

      // Ensure we have valid data
      if (!data || data.length === 0) {
        console.log('No data found')
        setMinis([])
        setTotalMinis(0)
        setTotalQuantity(0)
        setLoading(false)
        return
      }

      console.log('Total minis:', totalCount)
      // Update total counts
      setTotalMinis(totalCount)
      setTotalQuantity(totalQuantity)

      // Calculate current page data
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = Math.min(startIndex + pageSize, totalCount)
      const pageData = data.slice(startIndex, endIndex)

      console.log(`Page data for page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}, length=${pageData.length}`)
      
      // Update minis for current page
      const transformedMinis = pageData.map(mini => transformMini(mini))
      console.log('Transformed minis length:', transformedMinis.length)
      setMinis(transformedMinis)
      setLoading(false)

    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setLoading(false)
    }
  }, [currentPage, pageSize, fetchAllData, isCacheValid])

  // Add invalidateCache function
  const invalidateCache = useCallback(() => {
    console.log('Invalidating cache')
    globalCache = null
  }, [])

  // Create a ref for the debounced search function
  const debouncedSearch = useRef(
    debounce(async (term: string | null) => {
      try {
        setLoading(true)
        setError(null)

        // If we have valid cache and a search term, try to filter cached data first
        if (isCacheValid() && globalCache?.minis) {
          if (term) {
            const filteredMinis = globalCache.minis.filter(mini => 
              mini.name.toLowerCase().includes(term.toLowerCase())
            )
            setMinis(filteredMinis.map(mini => transformMini(mini)))
            setTotalMinis(filteredMinis.length)
            setTotalQuantity(filteredMinis.reduce((acc, curr) => acc + (curr.quantity || 0), 0))
            setLoading(false)
            return
          }
        }

        // If no cache or no search term, fetch new data
        const { data, totalQuantity, totalCount } = await fetchAllData()
        
        const startIndex = (currentPage - 1) * pageSize
        const endIndex = startIndex + pageSize
        const pageData = data.slice(startIndex, endIndex)
        
        setMinis(pageData.map(mini => transformMini(mini)))
        setTotalMinis(totalCount)
        setTotalQuantity(totalQuantity)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }, SEARCH_DEBOUNCE)
  ).current

  // Update search term handler
  const handleSearch = useCallback((term: string | null) => {
    setInternalSearchTerm(term)
    debouncedSearch(term)
  }, [debouncedSearch])

  // Setup real-time subscription
  useEffect(() => {
    // Setup subscription to minis table
    const subscription = supabase
      .channel('minis_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minis'
        },
        async (payload) => {
          // Skip updates if we're not using the cache
          if (!isCacheValid()) return;

          // For updates, only process if the data actually changed
          if (payload.eventType === 'UPDATE') {
            const existingMini = globalCache?.minis.find(m => m.id === payload.new.id);
            if (existingMini && JSON.stringify(existingMini) === JSON.stringify(payload.new)) {
              return;
            }
          }

          // Batch updates using debounce
          const processUpdate = debounce(async () => {
            try {
              if (!isCacheValid()) return;

              switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE': {
                  const { data: updatedMini } = await supabase
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
                    .eq('id', payload.new.id)
                    .returns<SupabaseMini>()
                    .single()

                  if (updatedMini) {
                    if (payload.eventType === 'INSERT') {
                      const newMinis = [...globalCache!.minis, updatedMini].sort((a, b) => 
                        a.name.localeCompare(b.name)
                      ) as SupabaseMini[]

                      globalCache = {
                        ...globalCache!,
                        minis: newMinis,
                        timestamp: Date.now()
                      }
                    } else {
                      const updatedMinis = globalCache!.minis.map(mini => 
                        mini.id === payload.new.id ? updatedMini : mini
                      ) as SupabaseMini[]

                      globalCache = {
                        ...globalCache!,
                        minis: updatedMinis,
                        timestamp: Date.now()
                      }
                    }
                  }
                  break;
                }

                case 'DELETE':
                  globalCache = {
                    ...globalCache!,
                    minis: globalCache!.minis.filter(mini => 
                      mini.id !== payload.old.id
                    ),
                    timestamp: Date.now()
                  }
                  break;
              }

              // Only update if we're still on the same page
              if (currentPageRef.current === currentPage) {
                updateFromCache(currentPage)
              }
            } catch (error) {
              console.error('Error processing real-time update:', error)
            }
          }, 100)

          processUpdate()
        }
      )
      .subscribe()

    subscriptionRef.current = () => {
      subscription.unsubscribe()
    }

    return () => {
      subscriptionRef.current?.()
    }
  }, [currentPage, isCacheValid, updateFromCache])

  // Modify getPageMinis to use global cache
  const getPageMinis = async (pageNum: number): Promise<Mini[]> => {
    try {
      if (isCacheValid()) {
        const startIndex = (pageNum - 1) * pageSize
        const endIndex = startIndex + pageSize
        return globalCache!.minis
          .slice(startIndex, endIndex)
          .map(mini => transformMini(mini))
      }

      // If cache is invalid, fetch all data again
      const { data } = await fetchAllData()
      const startIndex = (pageNum - 1) * pageSize
      const endIndex = startIndex + pageSize
      return (data || [])
        .slice(startIndex, endIndex)
        .map(mini => transformMini(mini))
    } catch (error) {
      console.error('Error in getPageMinis:', error)
      return []
    }
  }

  // Modify getAllMinis to use global cache
  const getAllMinis = async (): Promise<Mini[]> => {
    try {
      if (isCacheValid()) {
        return globalCache!.minis.map(mini => transformMini(mini))
      }

      const { data } = await fetchAllData()
      return (data || []).map(mini => transformMini(mini))
    } catch (error) {
      console.error('Error in getAllMinis:', error)
      return []
    }
  }

  // Add getTotalQuantity function
  const getTotalQuantity = useCallback(async () => {
    try {
      const { data } = await fetchAllData()
      const totalQuantitySum = data?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0
      setTotalQuantity(totalQuantitySum)
      return totalQuantitySum
    } catch (error) {
      console.error('Error getting total quantity:', error)
      return 0
    }
  }, [fetchAllData])

  // Clean up the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Remove duplicate effects and keep only one main effect
  useEffect(() => {
    loadData()

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (subscriptionRef.current) {
        subscriptionRef.current()
      }
      debouncedSearch.cancel()
    }
  }, [currentPage, internalSearchTerm, loadData]) // Add loadData to dependencies

  const handleDelete = async (miniId: number) => {
    try {
      await deleteMiniature(miniId)
      
      // Invalidate cache to force a fresh fetch
      invalidateCache()
      
      // Refresh the minis list
      const updatedMinis = await getPageMinis(currentPage)
      if (updatedMinis) {
        // Force a re-render by updating the state
        setMinis(updatedMinis)
        // Update total quantity
        await getTotalQuantity()
        // Force refresh of images
        refreshImages()
      }
      
      showSuccess('Miniature deleted successfully')
    } catch (error) {
      console.error('Error deleting miniature:', error)
      showError('Failed to delete miniature')
    }
  }

  return {
    minis,
    loading,
    error,
    currentPage,
    totalPages: Math.max(1, Math.ceil(totalMinis / pageSize)),
    totalMinis,
    totalQuantity,
    setCurrentPage: (page: number) => {
      const maxPage = Math.max(1, Math.ceil(totalMinis / pageSize))
      const validPage = Math.max(1, Math.min(page, maxPage))
      setCurrentPage(validPage)
    },
    searchTerm: internalSearchTerm,
    setSearchTerm: handleSearch,
    refreshData: loadData,
    getPageMinis,
    getAllMinis,
    getTotalQuantity,
    setMinis,
    invalidateCache,
    handleDelete
  }
} 