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
  material_id: number | null
  in_use: string | null
  has_image: boolean
  types: SupabaseMiniType[]
  painted_by: {
    id: number
    painted_by_name: string
  }
  base_sizes: {
    id: number
    base_size_name: string
  }
  material?: {
    id: number
    material_name: string
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
  material_id: item.material_id,
  in_use: item.in_use,
  has_image: item.has_image,
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
  material: item.material ? {
    id: item.material.id,
    material_name: item.material.material_name
  } : undefined,
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

const MINIATURE_QUERY = `
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
  material_id,
  in_use,
  has_image,
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
  material:material_id(
    id,
    material_name,
    created_at,
    updated_at
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
`

let globalCache: Cache | null = null

type SupabaseResponse = {
  data: SupabaseMini[] | null
  error: any
}

export function useMinis(pageSize: number = 10, searchTerm?: string | null) {
  const [minis, setMinis] = useState<Mini[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMinis, setTotalMinis] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [internalSearchTerm, setInternalSearchTerm] = useState<string | null>(searchTerm || null)
  const [showMissingImages, setShowMissingImages] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const isLoadingRef = useRef(false)

  // Update search term with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setInternalSearchTerm(searchTerm || null)
    }, SEARCH_DEBOUNCE)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

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
    return Date.now() - globalCache.timestamp <= CACHE_DURATION
  }, [])

  const fetchAllData = useCallback(async () => {
    try {
      // If we have valid cache, use it and just apply filters
      if (isCacheValid() && globalCache) {
        // console.log('Using cached data for filtering')
        let filteredData = [...globalCache.minis]

        // Apply search filters
        if (internalSearchTerm) {
          const searchTerms = internalSearchTerm.split(' AND ')
          filteredData = filteredData.filter((mini) => {
            return searchTerms.every(term => {
              if (term.startsWith('name:')) {
                const searchValue = term.substring(5).toLowerCase()
                return mini.name.toLowerCase().includes(searchValue)
              }
              
              if (term.startsWith('type:')) {
                const searchValue = term.substring(5).toLowerCase()
                return mini.types?.some(t => 
                  !t.proxy_type && t.type.name.toLowerCase().includes(searchValue)
                ) || false
              }
              
              if (term.startsWith('productset:')) {
                const searchValue = term.substring(11).toLowerCase()
                return (
                  mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
                  mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
                  mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue)
                ) || false
              }
              
              if (term.startsWith('paintedby:')) {
                const searchValue = term.substring(10).toLowerCase()
                return mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) || false
              }

              if (term.startsWith('tags:')) {
                const searchValues = term.substring(5).toLowerCase().split(',')
                return searchValues.every(tag => 
                  mini.tags?.some(t => t.tag.name.toLowerCase() === tag.trim())
                )
              }

              if (term.startsWith('alltype:')) {
                const searchValue = term.substring(8).toLowerCase()
                return mini.types?.some(t => 
                  t.type.name.toLowerCase().includes(searchValue)
                ) || false
              }

              // If no prefix, search everywhere (fallback)
              const searchValue = term.toLowerCase()
              return (
                mini.name.toLowerCase().includes(searchValue) ||
                mini.types?.some(t => t.type.name.toLowerCase().includes(searchValue)) ||
                mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
                mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
                mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue) ||
                mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) ||
                mini.tags?.some(t => t.tag.name.toLowerCase().includes(searchValue))
              )
            })
          })
        }

        // Apply missing images filter
        if (showMissingImages) {
          filteredData = filteredData.filter(mini => !mini.has_image)
        }

        const totalQuantitySum = filteredData.reduce((acc: number, curr: { quantity: number }) => 
          acc + (curr.quantity || 0), 0
        )

        return {
          data: filteredData.map(mini => transformMini(mini)),
          totalQuantity: totalQuantitySum,
          totalCount: filteredData.length
        }
      }

      // If no valid cache, fetch from Supabase
      // console.log('No valid cache, fetching from Supabase')
      
      // First get the total count
      // console.log('Supabase Query: Fetching total count of minis')
      let countQuery = supabase.from('minis').select('*', { count: 'exact', head: true })
      
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      
      // Store total count
      const totalCount = count || 0
      setTotalMinis(totalCount)

      // Build the data query
      // console.log('Supabase Query: Fetching all minis data')
      let dataQuery = supabase.from('minis').select(MINIATURE_QUERY).order('name')

      // Get all data in chunks to handle large datasets
      let allData: SupabaseMini[] = []
      let page = 0
      const chunkSize = 1000
      
      while (true) {
        // console.log(`Supabase Query: Fetching minis chunk ${page + 1} (${page * chunkSize} - ${(page + 1) * chunkSize - 1})`)
        const result = await dataQuery
          .range(page * chunkSize, (page + 1) * chunkSize - 1) as unknown as SupabaseResponse

        const { data, error } = result
        if (error) throw error
        if (!data || data.length === 0) break

        allData = [...allData, ...data]
        if (data.length < chunkSize) break
        page++
      }

      // Store the raw data in cache before filtering
      globalCache = {
        minis: allData,
        totalQuantity: allData.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
        timestamp: Date.now(),
        searchTerm: null
      }

      // Now apply filters to the cached data
      let filteredData = [...allData]

      if (internalSearchTerm) {
        const searchTerms = internalSearchTerm.split(' AND ')
        filteredData = filteredData.filter((mini) => {
          return searchTerms.every(term => {
            if (term.startsWith('name:')) {
              const searchValue = term.substring(5).toLowerCase()
              return mini.name.toLowerCase().includes(searchValue)
            }
            
            if (term.startsWith('type:')) {
              const searchValue = term.substring(5).toLowerCase()
              return mini.types?.some(t => 
                !t.proxy_type && t.type.name.toLowerCase().includes(searchValue)
              ) || false
            }
            
            if (term.startsWith('productset:')) {
              const searchValue = term.substring(11).toLowerCase()
              return (
                mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
                mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
                mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue)
              ) || false
            }
            
            if (term.startsWith('paintedby:')) {
              const searchValue = term.substring(10).toLowerCase()
              return mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) || false
            }

            if (term.startsWith('tags:')) {
              const searchValues = term.substring(5).toLowerCase().split(',')
              return searchValues.every(tag => 
                mini.tags?.some(t => t.tag.name.toLowerCase() === tag.trim())
              )
            }

            if (term.startsWith('alltype:')) {
              const searchValue = term.substring(8).toLowerCase()
              return mini.types?.some(t => 
                t.type.name.toLowerCase().includes(searchValue)
              ) || false
            }

            // If no prefix, search everywhere (fallback)
            const searchValue = term.toLowerCase()
            return (
              mini.name.toLowerCase().includes(searchValue) ||
              mini.types?.some(t => t.type.name.toLowerCase().includes(searchValue)) ||
              mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
              mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
              mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue) ||
              mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) ||
              mini.tags?.some(t => t.tag.name.toLowerCase().includes(searchValue))
            )
          })
        })
      }

      if (showMissingImages) {
        filteredData = filteredData.filter(mini => !mini.has_image)
      }

      const totalQuantitySum = filteredData.reduce((acc: number, curr: { quantity: number }) => 
        acc + (curr.quantity || 0), 0
      )

      return {
        data: filteredData.map(mini => transformMini(mini)),
        totalQuantity: totalQuantitySum,
        totalCount: filteredData.length
      }

    } catch (error) {
      console.error('Error fetching all data:', error)
      throw error
    }
  }, [internalSearchTerm, showMissingImages, setTotalMinis, isCacheValid])

  // Add loadData function
  const loadData = useCallback(async () => {
    try {
      // If we're already loading, don't start another load
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      // console.log('Loading data for page', currentPage)
      // Get filtered data either from cache or from Supabase
      const { data, totalQuantity, totalCount } = await fetchAllData()

      // Ensure we have valid data
      if (!data || data.length === 0) {
        setMinis([])
        setTotalQuantity(0)
        setLoading(false)
        isLoadingRef.current = false
        return
      }

      setTotalQuantity(totalQuantity)
      setTotalMinis(totalCount)

      // Calculate current page data
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = Math.min(startIndex + pageSize, totalCount)
      const pageData = data.slice(startIndex, endIndex)
      
      setMinis(pageData)
      setLoading(false)
      isLoadingRef.current = false

    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [currentPage, pageSize, fetchAllData, setTotalMinis])

  // Remove other useEffects that trigger loadData and consolidate into one
  useEffect(() => {
    // Initial load
    loadData()
  }, [currentPage, internalSearchTerm, showMissingImages]) // Only keep the essential dependencies

  // Remove the effect that watches minis.length
  // Remove any other effects that might trigger data loading

  // Add invalidateCache function
  const invalidateCache = useCallback(() => {
    // console.log('Invalidating cache')
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
            const searchLower = term.toLowerCase()
            const filteredMinis = globalCache.minis.filter(mini => {
              if (mini.name.toLowerCase().includes(searchLower)) return true
              if (mini.types?.some(t => t.type.name.toLowerCase().includes(searchLower))) return true
              if (mini.product_sets?.name?.toLowerCase().includes(searchLower)) return true
              if (mini.product_sets?.product_line?.name?.toLowerCase().includes(searchLower)) return true
              if (mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchLower)) return true
              return false
            })
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
        
        setMinis(pageData.map((mini: SupabaseMini) => transformMini(mini)))
        setTotalMinis(totalCount)
        setTotalQuantity(totalQuantity)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }, SEARCH_DEBOUNCE)
  )

  // Setup real-time subscription
  useEffect(() => {
    if (subscriptionRef.current) return

    const subscription = supabase
      .channel('minis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minis'
        },
        async (payload: { eventType: string; new: any; old: any }) => {
          // Clear cache on any change
          globalCache = null

          // Debounce updates to prevent rapid re-renders
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current)
          }

          updateTimeoutRef.current = setTimeout(async () => {
            try {
              console.log('Supabase Query: Fetching updated mini data after real-time update')
              const { data: updatedMini } = await (supabase
                .from('minis')
                .select(MINIATURE_QUERY)
                .eq('id', payload.new.id) as unknown as Promise<{ 
                  data: SupabaseMini | null 
                  error: any 
                }>)

              if (updatedMini) {
                // Update the UI optimistically
                setMinis((prev: Mini[]) => {
                  const index = prev.findIndex(m => m.id === updatedMini.id)
                  if (index === -1) return prev
                  const newMinis = [...prev]
                  newMinis[index] = transformMini(updatedMini as SupabaseMini)
                  return newMinis
                })
              }

              // Refresh total quantity
              const { totalQuantity: newTotal } = await fetchAllData()
              setTotalQuantity(newTotal)
            } catch (err) {
              console.error('Error handling real-time update:', err)
            }
          }, 100)
        }
      )
      .subscribe()

    subscriptionRef.current = () => {
      subscription.unsubscribe()
      subscriptionRef.current = null
    }

    return () => {
      subscriptionRef.current?.()
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  // Modify getPageMinis to use global cache
  const getPageMinis = async (pageNum: number): Promise<Mini[]> => {
    try {
      if (isCacheValid() && globalCache) {
        const startIndex = (pageNum - 1) * pageSize
        const endIndex = startIndex + pageSize
        return globalCache.minis
          .slice(startIndex, endIndex)
          .map((item) => transformMini(item as SupabaseMini))
      }

      // If cache is invalid, fetch all data again
      const { data } = await fetchAllData()
      const startIndex = (pageNum - 1) * pageSize
      const endIndex = startIndex + pageSize
      return (data || [])
        .slice(startIndex, endIndex)
        .map((item) => transformMini(item as SupabaseMini))
    } catch (error) {
      console.error('Error in getPageMinis:', error)
      return []
    }
  }

  // Add getTotalQuantity function
  const getTotalQuantity = useCallback(async () => {
    try {
      const { data } = await fetchAllData()
      const totalQuantitySum = data?.reduce((acc: any, curr: { quantity: any }) => acc + (curr.quantity || 0), 0) || 0
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
      debouncedSearch.current.cancel()
    }
  }, [debouncedSearch])

  // Add effect to refresh data when filters change
  useEffect(() => {
    loadData()
  }, [currentPage, internalSearchTerm, showMissingImages]) // Add showMissingImages to dependencies

  // Remove duplicate effects and keep only one main effect
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (subscriptionRef.current) {
        subscriptionRef.current()
      }
      debouncedSearch.current.cancel()
    }
  }, []) // Empty dependency array for cleanup

  // Update setShowMissingImages to NOT invalidate cache
  const setShowMissingImagesAndInvalidate = useCallback((value: boolean) => {
    setShowMissingImages(value)
    // Don't invalidate cache, we want to filter locally
  }, [])

  const getCachedTotal = useCallback(() => {
    return globalCache?.minis.length || totalMinis;
  }, [globalCache, totalMinis]);

  return {
    minis,
    loading,
    error,
    totalMinis: getCachedTotal(),
    totalQuantity,
    getPageMinis,
    getAllMinis: fetchAllData,
    setMinis,
    getTotalQuantity,
    currentPage,
    setCurrentPage,
    invalidateCache,
    setTotalMinis,
    setInternalSearchTerm,
    showMissingImages,
    setShowMissingImages: setShowMissingImagesAndInvalidate
  }
} 
