import { useState, useEffect } from 'react'
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

interface TypeCategory {
  category: Category
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
      { data: productSetsData, error: productSetsError },
      { data: types, error: typesError }
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
    if (productSetsError) throw productSetsError
    if (typesError) throw typesError

    const transformedTypes: MiniType[] = (types || []).map(type => ({
      id: type.id,
      name: type.name,
      categories: type.categories
        .filter((cat): cat is TypeCategory => Boolean(cat?.category))
        .map(cat => ({
          id: cat.category!.id,
          name: cat.category!.name
        }))
    }))

    // Update store
    store = {
      paintedByOptions: paintedBy || [],
      baseSizeOptions: baseSizes || [],
      companies: companiesData || [],
      productLines: productLinesData || [],
      productSets: productSetsData || [],
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
          table: 'product_companies'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_lines'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_sets'
        },
        () => loadData()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    loading: state.loading,
    error: state.error,
    paintedByOptions: state.paintedByOptions,
    baseSizeOptions: state.baseSizeOptions,
    companies: state.companies,
    miniTypes: state.miniTypes,
    getProductLinesByCompany: (companyId: number) => 
      state.productLines.filter(pl => pl.company_id === companyId),
    getProductSetsByProductLine: (productLineId: number) =>
      state.productSets.filter(ps => ps.product_line_id === productLineId)
  }
} 