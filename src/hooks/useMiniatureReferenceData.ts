import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

export function useMiniatureReferenceData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paintedByOptions, setPaintedByOptions] = useState<PaintedBy[]>([])
  const [baseSizeOptions, setBaseSizeOptions] = useState<BaseSize[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [productSets, setProductSets] = useState<ProductSet[]>([])
  const [miniTypes, setMiniTypes] = useState<MiniType[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all other data first
        const [
          { data: paintedBy, error: paintedByError },
          { data: baseSizes, error: baseSizesError },
          { data: companiesData, error: companiesError },
          { data: productLinesData, error: productLinesError },
          { data: productSetsData, error: productSetsError }
        ] = await Promise.all([
          supabase.from('painted_by').select('*').order('painted_by_name'),
          supabase.from('base_sizes').select('*').order('base_size_name'),
          supabase.from('product_companies').select('*').order('name'),
          supabase.from('product_lines').select('*').order('name'),
          supabase.from('product_sets').select('*').order('name')
        ])

        if (paintedByError) throw paintedByError
        if (baseSizesError) throw baseSizesError
        if (companiesError) throw companiesError
        if (productLinesError) throw productLinesError
        if (productSetsError) throw productSetsError

        setPaintedByOptions(paintedBy || [])
        setBaseSizeOptions(baseSizes || [])
        setCompanies(companiesData || [])
        setProductLines(productLinesData || [])
        setProductSets(productSetsData || [])

        // Load all mini types with their categories
        const loadAllTypes = async () => {
          const allTypes = []
          let lastId = 0
          let hasMore = true

          while (hasMore) {
            const { data: types, error: typesError } = await supabase
              .from('mini_types')
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
              .gt('id', lastId)
              .limit(1000)
              .returns<Array<{
                id: number;
                name: string;
                categories: Array<{
                  category: {
                    id: number;
                    name: string;
                  } | null;
                }>;
              }>>()

            if (typesError) {
              throw typesError
            }
            if (!types || types.length === 0) {
              hasMore = false
              break
            }

            allTypes.push(...types)
            lastId = types[types.length - 1].id
          }

          const transformedTypes: MiniType[] = allTypes.map(type => {
            const transformed = {
              id: type.id,
              name: type.name,
              categories: type.categories
                .filter((cat): cat is TypeCategory => Boolean(cat?.category))
                .map(cat => ({
                  id: cat.category!.id,
                  name: cat.category!.name
                }))
            }
            return transformed
          })

          setMiniTypes(transformedTypes)
        }

        await loadAllTypes()
      } catch (err) {
        console.error('Error loading reference data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return {
    loading,
    error,
    paintedByOptions,
    baseSizeOptions,
    companies,
    miniTypes,
    getProductLinesByCompany: (companyId: number) => 
      productLines.filter(pl => pl.company_id === companyId),
    getProductSetsByProductLine: (productLineId: number) =>
      productSets.filter(ps => ps.product_line_id === productLineId)
  }
} 