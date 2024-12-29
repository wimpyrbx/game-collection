import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseMonitor'

interface PaintedBy {
  id: number
  painted_by_name: string
}

interface BaseSize {
  id: number
  base_size_name: string
}

interface Company {
  id: number
  name: string
}

interface ProductLine {
  id: number
  name: string
  company_id: number
}

interface ProductSet {
  id: number
  name: string
  product_line_id: number
}

interface Category {
  id: number
  name: string
}

interface Material {
  id: number
  material_name: string
  created_at: string
  updated_at: string
}

interface MiniType {
  id: number
  name: string
  categories: Category[]
}

// Add singleton store
interface ReferenceDataStore {
  paintedByOptions: PaintedBy[]
  baseSizeOptions: BaseSize[]
  companies: Company[]
  productLines: ProductLine[]
  productSets: ProductSet[]
  materials: Material[]
  miniTypes: MiniType[]
  loading: boolean
  error: string | null
  lastFetch: number
}

let store: ReferenceDataStore = {
  paintedByOptions: [],
  baseSizeOptions: [],
  companies: [],
  productLines: [],
  productSets: [],
  materials: [],
  miniTypes: [],
  loading: true,
  error: null,
  lastFetch: 0
}

let storePromise: Promise<void> | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function loadReferenceData() {
  try {
    store.loading = true
    store.error = null

    // Load all data in parallel
    const [
      { data: paintedBy, error: paintedByError },
      { data: baseSizes, error: baseSizesError },
      { data: companiesData, error: companiesError },
      { data: productLinesData, error: productLinesError },
      { data: materialsData, error: materialsError },
      { data: types, error: typesError }
    ] = await Promise.all([
      supabase.from('painted_by')
        .select('*')
        .order('painted_by_name', { ascending: true, nullsFirst: false })
        .then(({ data, error }) => {
          // Custom sort order for painted by options
          if (data) {
            data.sort((a, b) => {
              const order: Record<string, number> = {
                'self': 1,
                'prepainted': 2,
                'touchup': 3,
                'other': 4
              };
              const aOrder = order[a.painted_by_name.toLowerCase()] || 999;
              const bOrder = order[b.painted_by_name.toLowerCase()] || 999;
              if (aOrder === bOrder) {
                return a.painted_by_name.localeCompare(b.painted_by_name);
              }
              return aOrder - bOrder;
            });
          }
          return { data, error };
        }),
      supabase.from('base_sizes').select('*').order('base_size_name'),
      supabase.from('product_companies').select('*').order('name'),
      supabase.from('product_lines').select('*').order('name'),
      supabase.from('minis_materials')
        .select('id, material_name, created_at, updated_at')
        .order('material_name'),
      supabase.from('mini_types')
        .select(`
          id,
          name,
          categories:type_to_categories(
            category:mini_categories(
              id,
              name
            )
          )
        `)
        .order('id')
    ])

    if (paintedByError) throw paintedByError
    if (baseSizesError) throw baseSizesError
    if (companiesError) throw companiesError
    if (productLinesError) throw productLinesError
    if (materialsError) throw materialsError
    if (typesError) throw typesError

    // Batch fetch product sets
    let allProductSets: any[] = []
    let hasMoreSets = true
    let setStart = 0

    while (hasMoreSets) {
      const { data: productSetsData, error: productSetsError } = await supabase
        .from('product_sets')
        .select('*')
        .order('name')
        .range(setStart, setStart + 999)

      if (productSetsError) throw productSetsError

      if (productSetsData) {
        allProductSets = [...allProductSets, ...productSetsData]
        if (productSetsData.length < 1000) {
          hasMoreSets = false
        } else {
          setStart += 1000
        }
      } else {
        hasMoreSets = false
      }
    }

    const transformedTypes: MiniType[] = (types || []).map((type: any) => ({
      id: type.id,
      name: type.name,
      categories: type.categories
        .filter((cat: any) => cat?.category)
        .map((cat: any) => ({
          id: cat.category.id,
          name: cat.category.name
        }))
    }))

    // Update store
    store = {
      paintedByOptions: paintedBy || [],
      baseSizeOptions: baseSizes || [],
      companies: companiesData || [],
      productLines: productLinesData || [],
      productSets: allProductSets,
      materials: materialsData || [],
      miniTypes: transformedTypes,
      loading: false,
      error: null,
      lastFetch: Date.now()
    }
  } catch (err) {
    store.error = err instanceof Error ? err.message : 'An error occurred'
    store.loading = false
    throw err
  }
}

export function useMiniatureReferenceData() {
  const [state, setState] = useState<ReferenceDataStore>(store)

  useEffect(() => {
    const loadData = async () => {
      // Check if we need to refresh the data
      const now = Date.now()
      const needsRefresh = now - store.lastFetch > CACHE_DURATION

      if (needsRefresh || store.error || store.loading) {
        // If there's already a load in progress, wait for it
        if (!storePromise) {
          storePromise = loadReferenceData().finally(() => {
            storePromise = null
          })
        }

        try {
          await storePromise
          setState({ ...store })
        } catch (err) {
          console.error('Error loading reference data:', err)
        }
      }
    }

    loadData()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reference_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mini_types'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'painted_by'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'base_sizes'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minis_materials'
        },
        () => loadData()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getProductLinesByCompany = useCallback((companyId: number) => {
    return state.productLines.filter(line => line.company_id === companyId)
  }, [state.productLines])

  const getProductSetsByProductLine = useCallback((productLineId: number) => {
    return state.productSets.filter(set => set.product_line_id === productLineId)
  }, [state.productSets])

  return {
    loading: state.loading,
    error: state.error,
    paintedByOptions: state.paintedByOptions,
    baseSizeOptions: state.baseSizeOptions,
    companies: state.companies,
    materials: state.materials,
    miniTypes: state.miniTypes,
    getProductLinesByCompany,
    getProductSetsByProductLine
  }
} 