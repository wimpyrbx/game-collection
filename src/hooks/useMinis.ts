import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseMonitor'
import type { Mini } from '../types/mini'
import debounce from 'lodash/debounce'
import { createMiniature, updateMiniature, deleteMiniature } from '../services/miniatureService'
import type { MiniatureData } from '../services/miniatureService'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalMinis, setTotalMinis] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [internalSearchTerm, setInternalSearchTerm] = useState<string | null>(searchTerm || null)
  const [showMissingImages, setShowMissingImages] = useState(false)
  const [filteredCount, setFilteredCount] = useState(0)
  const [filteredTotalQuantity, setFilteredTotalQuantity] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const isLoadingRef = useRef(false)

  // Add flag to track our own changes
  const ourChangeRef = useRef<number | null>(null);

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

        return {
          data: filteredData.map(mini => transformMini(mini)),
          totalQuantity: globalCache.totalQuantity,
          totalCount: filteredData.length
        }
      }

      // If no valid cache, fetch from Supabase
      console.log('No valid cache, fetching from Supabase')
      
      // First get the total count
      console.log('Supabase Query: Fetching total count of minis')
      let countQuery = supabase.from('minis').select('*', { count: 'exact', head: true })
      
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      
      // Store total count
      const totalCount = count || 0
      console.log('Total count from Supabase:', totalCount)
      setTotalMinis(totalCount)

      // Build the data query
      console.log('Supabase Query: Fetching all minis data')
      let dataQuery = supabase.from('minis').select(MINIATURE_QUERY).order('name')

      // Get all data in chunks to handle large datasets
      let allData: SupabaseMini[] = []
      let page = 0
      const chunkSize = 1000 // Use smaller chunks to ensure we don't hit limits
      let hasMore = true
      let totalQuantitySum = 0
      
      while (hasMore) {
        console.log(`Fetching chunk ${page + 1} (${page * chunkSize} - ${(page + 1) * chunkSize - 1})`)
        const from = page * chunkSize
        const to = from + chunkSize - 1
        
        const result = await dataQuery
          .range(from, to) as unknown as SupabaseResponse

        const { data, error } = result
        if (error) throw error
        if (!data || data.length === 0) {
          hasMore = false
          break
        }

        // Add up quantities as we go through chunks
        const chunkQuantity = data.reduce((acc, curr) => {
          const quantity = Number(curr.quantity)
          return acc + (isNaN(quantity) ? 0 : quantity)
        }, 0)
        totalQuantitySum += chunkQuantity
        console.log(`Chunk ${page + 1} quantity sum:`, chunkQuantity)

        allData = [...allData, ...data]
        console.log(`Total entries so far:`, allData.length)
        hasMore = data.length === chunkSize // If we got less than chunkSize, we're done
        page++
      }

      console.log('Final data fetch complete:', {
        totalEntries: allData.length,
        totalQuantity: totalQuantitySum
      })

      // Store the raw data in cache with correct total quantity
      globalCache = {
        minis: allData,
        totalQuantity: allData.reduce((acc, curr) => {
          const quantity = Number(curr.quantity);
          return acc + (isNaN(quantity) ? 0 : quantity);
        }, 0),
        timestamp: Date.now(),
        searchTerm: null
      };

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

  // Add function to update views from cache
  const updateViewsFromCache = useCallback(() => {
    if (!globalCache) {
      console.log('updateViewsFromCache: No global cache available');
      return;
    }

    console.log('updateViewsFromCache: Starting update with cache size:', globalCache.minis.length);

    // Calculate total counts first (unfiltered)
    const totalCount = globalCache.minis.length;
    const totalQuantity = globalCache.minis.reduce((acc, curr) => {
      const quantity = Number(curr.quantity);
      return acc + (isNaN(quantity) ? 0 : quantity);
    }, 0);

    // Get initial data
    let filteredData = [...globalCache.minis];
    
    // Apply all filters in sequence
    if (internalSearchTerm) {
      console.log('Applying filters:', internalSearchTerm);
      
      // Split the search term into individual filters
      const filterTerms = internalSearchTerm.split(' AND ').map(term => term.trim()).filter(Boolean);
      console.log('Filter terms:', filterTerms);

      // Apply each filter term sequentially
      filterTerms.forEach(term => {
        if (term.startsWith('name:')) {
          const name = term.replace('name:', '').trim().toLowerCase();
          console.log('Applying name filter:', name);
          filteredData = filteredData.filter(mini => 
            mini.name.toLowerCase().includes(name)
          );
        }
        else if (term.startsWith('type:')) {
          const type = term.replace('type:', '').trim().toLowerCase();
          console.log('Applying type filter:', type);
          filteredData = filteredData.filter(mini => 
            mini.types?.some(t => !t.proxy_type && t.type.name.toLowerCase().includes(type))
          );
        }
        else if (term.startsWith('alltype:')) {
          const type = term.replace('alltype:', '').trim().toLowerCase();
          console.log('Applying alltype filter:', type);
          filteredData = filteredData.filter(mini => 
            mini.types?.some(t => t.type.name.toLowerCase().includes(type))
          );
        }
        else if (term.startsWith('productset:')) {
          const productSet = term.replace('productset:', '').trim().toLowerCase();
          console.log('Applying productset filter:', productSet);
          filteredData = filteredData.filter(mini => 
            mini.product_sets?.name?.toLowerCase().includes(productSet) ||
            mini.product_sets?.product_line?.name?.toLowerCase().includes(productSet) ||
            mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(productSet)
          );
        }
        else if (term.startsWith('paintedby:')) {
          const paintedBy = term.replace('paintedby:', '').trim().toLowerCase();
          console.log('Applying paintedby filter:', paintedBy);
          filteredData = filteredData.filter(mini => 
            mini.painted_by?.painted_by_name.toLowerCase().includes(paintedBy)
          );
        }
        else if (term.startsWith('tags:')) {
          const tags = term.replace('tags:', '').split(',').map(t => t.trim().toLowerCase());
          console.log('Applying tags filter:', tags);
          filteredData = filteredData.filter(mini => 
            tags.every(tag => mini.tags?.some(t => t.tag?.name.toLowerCase() === tag))
          );
        }
        
        console.log('After applying filter:', term, 'count:', filteredData.length);
      });
    }

    // Apply missing images filter last
    if (showMissingImages) {
      console.log('Applying missing images filter');
      filteredData = filteredData.filter(mini => !mini.has_image);
      console.log('After missing images filter count:', filteredData.length);
    }

    // Sort filtered data
    filteredData.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate filtered totals
    const filteredCount = filteredData.length;
    const filteredQuantity = filteredData.reduce((acc, curr) => {
      const quantity = Number(curr.quantity);
      return acc + (isNaN(quantity) ? 0 : quantity);
    }, 0);

    console.log('Final counts:', {
      total: totalCount,
      filtered: filteredCount,
      totalQuantity,
      filteredQuantity
    });

    // Update state
    setTotalMinis(totalCount);
    setTotalQuantity(totalQuantity);
    setFilteredCount(filteredCount);
    setFilteredTotalQuantity(filteredQuantity);

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredData.length);
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Update displayed minis
    setMinis(paginatedData.map(item => transformMini(item)));

    // Reset page if needed
    const maxPage = Math.ceil(filteredCount / pageSize);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(1);
    }
  }, [globalCache, internalSearchTerm, showMissingImages, currentPage, pageSize, setCurrentPage]);

  // Update loadData to use the new totals
  const loadData = useCallback(async () => {
    try {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // If cache is invalid, fetch from Supabase
      if (!isCacheValid() || !globalCache) {
        const { data } = await fetchAllData();
        if (!data) {
          setMinis([]);
          setTotalQuantity(0);
          setTotalMinis(0);
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Use updateViewsFromCache to handle filtering and pagination
      if (globalCache) {
        console.log('loadData: Calling updateViewsFromCache');
        updateViewsFromCache();
      }

      setLoading(false);
      isLoadingRef.current = false;

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentPage, pageSize, internalSearchTerm, showMissingImages, isCacheValid, fetchAllData, updateViewsFromCache]);

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
        setLoading(true);
        setError(null);

        // If cache is invalid, fetch from Supabase
        if (!isCacheValid() || !globalCache) {
          const { data } = await fetchAllData();
          if (!data) {
            setMinis([]);
            setTotalQuantity(0);
            setLoading(false);
            return;
          }
        }

        // Use cache for filtering
        if (globalCache) {
          let filteredData = [...globalCache.minis];

          if (term) {
            const searchTerms = term.split(' AND ');
            filteredData = filteredData.filter((mini) => {
              return searchTerms.every(term => {
                if (term.startsWith('name:')) {
                  const searchValue = term.substring(5).toLowerCase();
                  return mini.name.toLowerCase().includes(searchValue);
                }
                if (term.startsWith('type:')) {
                  const searchValue = term.substring(5).toLowerCase();
                  return mini.types?.some(t => 
                    !t.proxy_type && t.type.name.toLowerCase().includes(searchValue)
                  ) || false;
                }
                if (term.startsWith('productset:')) {
                  const searchValue = term.substring(11).toLowerCase();
                  return (
                    mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
                    mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
                    mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue)
                  ) || false;
                }
                if (term.startsWith('paintedby:')) {
                  const searchValue = term.substring(10).toLowerCase();
                  return mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) || false;
                }
                if (term.startsWith('tags:')) {
                  const searchValues = term.substring(5).toLowerCase().split(',');
                  return searchValues.every(tag => 
                    mini.tags?.some(t => t.tag.name.toLowerCase() === tag.trim())
                  );
                }
                if (term.startsWith('alltype:')) {
                  const searchValue = term.substring(8).toLowerCase();
                  return mini.types?.some(t => 
                    t.type.name.toLowerCase().includes(searchValue)
                  ) || false;
                }
                const searchValue = term.toLowerCase();
                return (
                  mini.name.toLowerCase().includes(searchValue) ||
                  mini.types?.some(t => t.type.name.toLowerCase().includes(searchValue)) ||
                  mini.product_sets?.name?.toLowerCase().includes(searchValue) ||
                  mini.product_sets?.product_line?.name?.toLowerCase().includes(searchValue) ||
                  mini.product_sets?.product_line?.company?.name?.toLowerCase().includes(searchValue) ||
                  mini.painted_by?.painted_by_name.toLowerCase().includes(searchValue) ||
                  mini.tags?.some(t => t.tag.name.toLowerCase().includes(searchValue))
                );
              });
            });
          }

          // Apply missing images filter
          if (showMissingImages) {
            filteredData = filteredData.filter(mini => !mini.has_image);
          }

          // Update totals
          const totalQuantitySum = filteredData.reduce((acc: number, curr: { quantity: number }) => 
            acc + (curr.quantity || 0), 0
          );

          // Apply pagination
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const pageData = filteredData.slice(startIndex, endIndex);
          
          setMinis(pageData.map(mini => transformMini(mini)));
          setTotalMinis(filteredData.length);
          setTotalQuantity(totalQuantitySum);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE)
  );

  // Update handleAdd to be the single source of truth for inserts
  const handleAdd = async (miniatureData: Partial<Mini>) => {
    console.log('handleAdd: Starting add operation');
    // Create a temporary ID for optimistic update
    const tempId = -Date.now();
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
    };

    try {
      // Do optimistic update first
      if (globalCache) {
        console.log('handleAdd: Adding to cache with temp ID:', tempId);
        // Add to cache
        globalCache.minis.push(tempMini as unknown as SupabaseMini);
        // Sort the cache by name to maintain consistent ordering
        globalCache.minis.sort((a, b) => a.name.localeCompare(b.name));
        console.log('handleAdd: Cache size after adding temp mini:', globalCache.minis.length);
        // Update views and totals
        updateViewsFromCache();
      } else {
        console.log('handleAdd: No global cache available for optimistic update');
      }

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
      };

      // Set flag to prevent subscription from processing our own change
      ourChangeRef.current = tempId;
      console.log('handleAdd: Set ourChangeRef to temp ID:', tempId);

      // Perform the single API call
      const newMini = await createMiniature(transformedData);
      console.log('handleAdd: Created mini with real ID:', newMini.id);

      // Update flag with real ID
      if (newMini) {
        ourChangeRef.current = newMini.id;
        console.log('handleAdd: Updated ourChangeRef to real ID:', newMini.id);
      }

      // Get the complete mini data
      const { data: fullMini } = await supabase
        .from('minis')
        .select(MINIATURE_QUERY)
        .eq('id', newMini.id)
        .single() as unknown as { data: SupabaseMini | null };

      if (fullMini && globalCache) {
        console.log('handleAdd: Replacing temp mini with full data');
        // Replace the temporary mini with the real one
        const index = globalCache.minis.findIndex(m => m.id === tempId);
        if (index !== -1) {
          globalCache.minis[index] = fullMini;
          // Sort again to maintain order
          globalCache.minis.sort((a, b) => a.name.localeCompare(b.name));
          console.log('handleAdd: Cache updated with full mini data');
          // Update views and totals
          updateViewsFromCache();
        } else {
          console.log('handleAdd: Could not find temp mini in cache');
        }
      } else {
        console.log('handleAdd: No full mini data or cache available');
      }

      // Keep flag a bit longer to ensure subscription doesn't process
      setTimeout(() => {
        if (ourChangeRef.current === newMini.id) {
          ourChangeRef.current = null;
          console.log('handleAdd: Cleared ourChangeRef');
        }
      }, 2000);

      return newMini;
    } catch (error) {
      console.log('handleAdd: Error occurred, reverting optimistic update');
      // Revert optimistic update on error
      if (globalCache) {
        globalCache.minis = globalCache.minis.filter(m => m.id !== tempId);
        console.log('handleAdd: Removed temp mini from cache');
        // Update views and totals after removing the failed entry
        updateViewsFromCache();
      }
      console.error('Error in handleAdd:', error);
      ourChangeRef.current = null;
      throw error;
    }
  };

  // Update handleEdit to use updateViewsFromCache
  const handleEdit = async (miniId: number, miniatureData: Partial<Mini>) => {
    const currentMini = minis.find(m => m.id === miniId);
    if (!currentMini) throw new Error('Mini not found');

    try {
      const optimisticMini: Mini = {
        ...currentMini,
        ...miniatureData as Partial<Mini>,
        updated_at: new Date().toISOString()
      };

      // Update cache first
      if (globalCache) {
        const index = globalCache.minis.findIndex(m => m.id === miniId);
        if (index !== -1) {
          globalCache.minis[index] = optimisticMini as unknown as SupabaseMini;
          // Update views and pagination
          updateViewsFromCache();
        }
      }

      // Transform data and perform API call
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
      };

      await updateMiniature(miniId, transformedData);
    } catch (error) {
      // Revert cache update on error
      if (globalCache) {
        const index = globalCache.minis.findIndex(m => m.id === miniId);
        if (index !== -1) {
          globalCache.minis[index] = currentMini as unknown as SupabaseMini;
          // Update views and pagination
          updateViewsFromCache();
        }
      }
      throw error;
    }
  };

  // Update handleDelete to use updateViewsFromCache
  const handleDelete = async (miniId: number) => {
    const miniToDelete = minis.find(m => m.id === miniId);
    if (!miniToDelete) throw new Error('Mini not found');

    try {
      // Update cache first
      if (globalCache) {
        globalCache.minis = globalCache.minis.filter(m => m.id !== miniId);
        // Update views and pagination
        updateViewsFromCache();
      }

      // Perform API call
      await deleteMiniature(miniId);
    } catch (error) {
      // Revert cache update on error
      if (globalCache) {
        globalCache.minis.push(miniToDelete as unknown as SupabaseMini);
        // Update views and pagination
        updateViewsFromCache();
      }
      throw error;
    }
  };

  const handleUpdateInUse = async (miniId: number, inUse: boolean) => {
    try {
      const { data, error } = await supabase
        .from('minis')
        .update({ in_use: inUse ? new Date().toISOString() : null })
        .eq('id', miniId)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (data) {
        // Update the cache with the new data
        const updatedMinis = minis.map(mini =>
          mini.id === miniId ? { ...mini, in_use: inUse ? new Date().toISOString() : null } : mini
        )
        setMinis(updatedMinis)
        updateViewsFromCache()
      }

      return data
    } catch (error) {
      console.error('Error updating in_use status:', error)
      throw error
    }
  }

  // Update subscription handler to be more strict about skipping our own changes
  useEffect(() => {
    if (subscriptionRef.current) return;

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
          // Skip if this is our own change
          if (ourChangeRef.current === payload.new?.id || ourChangeRef.current === -payload.new?.id) {
            console.log('Skipping our own change:', payload.new?.id);
            return;
          }

          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }

          updateTimeoutRef.current = setTimeout(async () => {
            try {
              if (globalCache) {
                let updatedMinis = [...globalCache.minis];
                const index = updatedMinis.findIndex(m => m.id === payload.new?.id);

                if (payload.eventType === 'DELETE') {
                  if (index !== -1) {
                    updatedMinis.splice(index, 1);
                  }
                } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const { data: updatedMini } = await supabase
                .from('minis')
                .select(MINIATURE_QUERY)
                    .eq('id', payload.new.id)
                    .single() as unknown as { data: SupabaseMini | null };

              if (updatedMini) {
                    if (index !== -1) {
                      updatedMinis[index] = updatedMini;
                    } else {
                      updatedMinis.push(updatedMini);
                    }
                  }
                }

                // Update cache
                globalCache = {
                  ...globalCache,
                  minis: updatedMinis,
                  timestamp: Date.now()
                };

                // Update views and pagination
                updateViewsFromCache();
              }
            } catch (err) {
              console.error('Error handling real-time update:', err);
            }
          }, 100);
        }
      )
      .subscribe();

    subscriptionRef.current = () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };

    return () => {
      subscriptionRef.current?.();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [currentPage, pageSize, internalSearchTerm, showMissingImages]);

  // Update getPageMinis to use only cache
  const getPageMinis = async (pageNum: number): Promise<Mini[]> => {
    try {
      if (!isCacheValid() || !globalCache) {
        const { data } = await fetchAllData();
        if (!data) return [];
      }

      if (globalCache) {
        let filteredData = [...globalCache.minis];

        // Apply current filters
        if (internalSearchTerm) {
          // ... (same filtering logic as in loadData)
        }
        if (showMissingImages) {
          filteredData = filteredData.filter(mini => !mini.has_image);
        }

        const startIndex = (pageNum - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData
        .slice(startIndex, endIndex)
          .map(item => transformMini(item));
      }

      return [];
    } catch (error) {
      console.error('Error in getPageMinis:', error);
      return [];
    }
  };

  // Update getTotalQuantity to use only cache
  const getTotalQuantity = useCallback(async () => {
    try {
      if (!isCacheValid() || !globalCache) {
        const { data } = await fetchAllData();
        if (!data) return 0;
      }

      if (globalCache) {
        let filteredData = [...globalCache.minis];

        // Apply current filters
        if (internalSearchTerm) {
          // ... (same filtering logic as in loadData)
        }
        if (showMissingImages) {
          filteredData = filteredData.filter(mini => !mini.has_image);
        }

        const totalQuantitySum = filteredData.reduce((acc: number, curr: { quantity: number }) => 
          acc + (curr.quantity || 0), 0
        );
        setTotalQuantity(totalQuantitySum);
        return totalQuantitySum;
      }

      return 0;
    } catch (error) {
      console.error('Error getting total quantity:', error);
      return 0;
    }
  }, [internalSearchTerm, showMissingImages, isCacheValid, fetchAllData]);

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

  return {
    minis,
    loading,
    error,
    totalMinis,
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
    setShowMissingImages: setShowMissingImagesAndInvalidate,
    handleAdd,
    handleEdit,
    handleDelete,
    handleUpdateInUse,
    filteredCount,
    filteredTotalQuantity
  }
} 
