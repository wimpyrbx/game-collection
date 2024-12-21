import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseMonitor'
import type { MiniType, MiniCategory } from '../types/mini'

interface TypeCategoryRelation {
  type_id: number
  category_id: number
}

interface DbType {
  id: number
  name: string
  type_to_categories?: Array<{
    category_id: number
  }>
}

interface Cache {
  types: Array<{
    id: number
    name: string
    categories: Array<{
      category: {
        id: number
        name: string
      }
    }>
  }>
  categories: MiniCategory[]
  typeCategoryRelations: TypeCategoryRelation[]
  timestamp: number
  searchTerm: string
  typesWithoutCategories: number
  totalCategories: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Singleton cache manager
class TypeCategoryCache {
  private static instance: TypeCategoryCache
  private cache: Cache | null = null
  private loadPromise: Promise<Cache> | null = null

  private constructor() {}

  static getInstance(): TypeCategoryCache {
    if (!TypeCategoryCache.instance) {
      TypeCategoryCache.instance = new TypeCategoryCache()
    }
    return TypeCategoryCache.instance
  }

  isValid(): boolean {
    if (!this.cache) return false
    if (Date.now() - this.cache.timestamp > CACHE_DURATION) return false
    return true
  }

  get data(): Cache | null {
    return this.cache
  }

  invalidate(): void {
    console.log('Invalidating type/category cache')
    this.cache = null
    this.loadPromise = null
  }


  async loadData(): Promise<Cache> {
    // If we're already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = (async () => {
      console.log('Fetching fresh type/category data')
      
      // First get total count of categories
      const { count: totalCategoryCount, error: countError } = await supabase
        .from('mini_categories')
        .select('*', { count: 'exact', head: true })
        .throwOnError()

      if (countError) throw countError
      
      if (totalCategoryCount === null) {
        throw new Error('Failed to get total category count')
      }

      console.log('Total categories count:', totalCategoryCount)
      
      // Get all categories using range-based pagination
      let allCategories: any[] = []
      let hasMoreCategories = true
      let categoryStart = 0
      
      while (hasMoreCategories) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('mini_categories')
          .select('*')
          .range(categoryStart, categoryStart + 999)
          .order('name')

        if (categoriesError) throw categoriesError
        
        if (categoriesData) {
          allCategories = [...allCategories, ...categoriesData]
          if (categoriesData.length < 1000) {
            hasMoreCategories = false
          } else {
            categoryStart += 1000
          }
        } else {
          hasMoreCategories = false
        }
      }

      // Get all types with their category relationships using range-based pagination
      let allTypes: any[] = []
      let hasMoreTypes = true
      let typeStart = 0
      
      while (hasMoreTypes) {
        const { data: typesData, error: typesError } = await supabase
          .from('mini_types')
          .select(`
            id,
            name,
            type_to_categories!type_id(
              category_id
            )
          `)
          .range(typeStart, typeStart + 999)
          .order('name')

        if (typesError) throw typesError
        
        if (typesData) {
          allTypes = [...allTypes, ...typesData]
          if (typesData.length < 1000) {
            hasMoreTypes = false
          } else {
            typeStart += 1000
          }
        } else {
          hasMoreTypes = false
        }
      }

      // Count types without categories
      const typesWithoutCategories = allTypes.filter(
        (type: DbType) => !type.type_to_categories?.length
      ).length

      // Transform the data
      const types = allTypes.map((type: DbType) => ({
        id: type.id,
        name: type.name,
        categories: type.type_to_categories?.map(() => ({
          category: []
        })) || []
      }))

      const typeCategoryRelations = allTypes.flatMap((type: DbType) => 
        (type.type_to_categories || []).map((rel: { category_id: number }) => ({
          type_id: type.id,
          category_id: rel.category_id
        }))
      )

      const newCache: Cache = {
        types: types.map((type: { id: number; name: string; categories: any[] }) => ({
          ...type,
          categories: [] // Add required categories property
        })),
        categories: allCategories,
        typeCategoryRelations,
        timestamp: Date.now(),
        searchTerm: '',
        typesWithoutCategories,
        totalCategories: totalCategoryCount || 0
      }

      this.cache = newCache
      return newCache
    })()

    try {
      const result = await this.loadPromise
      this.loadPromise = null
      return result
    } catch (error) {
      this.loadPromise = null
      throw error
    }
  }

  getTypeCategoryIds(typeId: number): number[] {
    if (!this.cache) return []
    return this.cache.typeCategoryRelations
      .filter(rel => rel.type_id === typeId)
      .map(rel => rel.category_id)
  }
}

export function useTypeCategoryAdmin() {
  const [miniTypes, setMiniTypes] = useState<MiniType[]>([])
  const [categories, setCategories] = useState<MiniCategory[]>([])
  const [selectedTypeCategories, setSelectedTypeCategories] = useState<number[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalCategories, setTotalCategories] = useState(0)
  const [error, setError] = useState('')

  const cache = TypeCategoryCache.getInstance()

  const invalidateCache = useCallback(() => {
    cache.invalidate()
  }, [])

  const filterAndPaginateData = useCallback(<T extends { name: string }>(
    data: T[],
    offset: number,
    limit: number,
    searchTerm: string
  ) => {
    // Only filter if there's actually a search term
    const filtered = searchTerm.trim()
      ? data.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : data

    // If limit is 0, return all items
    if (limit === 0) {
      return {
        items: filtered,
        totalCount: filtered.length
      }
    }

    const startIndex = offset
    const endIndex = offset + limit
    const pageItems = filtered.slice(startIndex, endIndex)

    return {
      items: pageItems,
      totalCount: filtered.length
    }
  }, [])

  async function initializeData(offset: number = 0, limit: number = 10) {
    try {
      const cacheData = await cache.loadData()
      
      // If limit is 0, return all types
      if (limit === 0) {
        const typesWithCategories = cacheData.types.map(type => ({
          ...type,
          categories: type.categories || []
        }))
        
        setMiniTypes(typesWithCategories)
        setCategories(cacheData.categories)
        setTotalCount(cacheData.types.length)
        setTotalCategories(cacheData.totalCategories)
        
        return {
          data: typesWithCategories,
          count: cacheData.types.length,
          typesWithoutCategories: cacheData.typesWithoutCategories
        }
      }
      
      const { items: pageTypes, totalCount: filteredCount } = filterAndPaginateData(
        cacheData.types,
        offset,
        limit,
        ''
      )
      
      const typesWithCategories = pageTypes.map(type => ({
        ...type,
        categories: type.categories || []
      }))
      
      setMiniTypes(typesWithCategories)
      setCategories(cacheData.categories)
      setTotalCount(cacheData.types.length)
      setTotalCategories(cacheData.totalCategories)
      
      return {
        data: typesWithCategories,
        count: filteredCount,
        typesWithoutCategories: cacheData.typesWithoutCategories
      }
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: [], count: 0, error: errorMessage }
    }
  }

  async function loadData(offset: number = 0, limit: number = 10, search: string = '') {
    try {
      if (!cache.isValid()) {
        return initializeData(offset, limit)
      }

      const cacheData = cache.data!
      
      // Always set the total counts to the full dataset size
      setTotalCount(cacheData.types.length)
      // Do not set totalCategories here as it should be managed by loadCategories
      
      // Skip filtering if no search term and return all items if limit is 0
      if (!search.trim()) {
        if (limit === 0) {
          setMiniTypes(cacheData.types as MiniType[])
          return {
            data: cacheData.types,
            count: cacheData.types.length,
            typesWithoutCategories: cacheData.typesWithoutCategories
          }
        }

        const startIndex = offset
        const endIndex = offset + limit
        const pageTypes = cacheData.types.slice(startIndex, endIndex)
        
        setMiniTypes(pageTypes as MiniType[])
        
        return {
          data: pageTypes,
          count: cacheData.types.length,
          typesWithoutCategories: cacheData.typesWithoutCategories
        }
      }

      const { items: pageTypes, totalCount: filteredCount } = filterAndPaginateData(
        cacheData.types,
        offset,
        limit,
        search
      )
      
      setMiniTypes(pageTypes as MiniType[])
      
      return {
        data: pageTypes,
        count: filteredCount,
        typesWithoutCategories: cacheData.typesWithoutCategories
      }
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: [], count: 0, error: errorMessage }
    }
  }

  const loadCategories = async (
    offset: number,
    limit: number,
    searchTerm?: string
  ) => {
    try {
      if (!cache.isValid()) {
        await initializeData()
      }

      const cacheData = cache.data!
      
      // Set total categories from the exact count in cache
      setTotalCategories(cacheData.totalCategories)
      console.log('Setting total categories to:', cacheData.totalCategories)

      // Skip filtering if no search term
      if (!searchTerm?.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageCategories = cacheData.categories.slice(startIndex, endIndex)

        return { 
          data: pageCategories, 
          count: cacheData.totalCategories // Use the exact count for total
        }
      }

      const { items: pageCategories, totalCount: filteredCount } = filterAndPaginateData(
        cacheData.categories,
        offset,
        limit,
        searchTerm
      )

      return { 
        data: pageCategories, 
        count: filteredCount // This is for pagination of filtered results
      }
    } catch (error) {
      console.error('Error in loadCategories:', error)
      return { data: null, error, count: 0 }
    }
  }

  async function loadTypeCategoryIds(typeId: number) {
    try {
      if (!cache.isValid()) {
        await initializeData()
      }

      const categoryIds = cache.getTypeCategoryIds(typeId)
      setSelectedTypeCategories(categoryIds)
      return { error: null }
    } catch (err) {
      console.error('Error loading type category IDs:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      return { error: errorMessage }
    }
  }

  // Update CRUD operations to use loadData with current parameters
  async function addType(name: string) {
    try {
      const { data: existingType, error: checkError } = await supabase
        .from('mini_types')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle()

      if (checkError) {
        return { error: checkError.message }
      }

      if (existingType) {
        return { error: 'A type with this name already exists' }
      }

      const { data, error: insertError } = await supabase
        .from('mini_types')
        .insert([{ name: name.trim() }])
        .select()
        .single()

      if (insertError) {
        return { error: insertError.message }
      }

      invalidateCache()
      return { data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      return { error: errorMessage }
    }
  }

  async function editType(id: number, name: string) {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { error } = await supabase
      .from('mini_types')
      .update({ name: name.trim() })
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    invalidateCache()
    return { error: null }
  }

  async function checkTypeUsage(typeId: number) {
    // Check mini_to_types
    const { data: miniUsage, error: miniError } = await supabase
      .from('mini_to_types')
      .select('mini_id')
      .eq('type_id', typeId)
      .limit(1)

    if (miniError) {
      return { error: miniError.message }
    }

    // Check type_to_categories
    const { data: categoryUsage, error: categoryError } = await supabase
      .from('type_to_categories')
      .select('category_id')
      .eq('type_id', typeId)
      .limit(1)

    if (categoryError) {
      return { error: categoryError.message }
    }

    return {
      canDelete: !miniUsage?.length && !categoryUsage?.length,
      inUseBy: {
        minis: miniUsage?.length > 0,
        categories: categoryUsage?.length > 0
      }
    }
  }

  async function deleteType(typeId: number) {
    const { canDelete, inUseBy, error: checkError } = await checkTypeUsage(typeId)
    
    if (checkError) {
      setError(checkError)
      return { error: checkError, canDelete: false, inUseBy }
    }

    if (!canDelete) {
      const errorMessage = `Cannot delete type because it is in use by ${
        inUseBy?.minis ? 'minis' : ''
      }${inUseBy?.minis && inUseBy?.categories ? ' and ' : ''}${
        inUseBy?.categories ? 'categories' : ''
      }`
      setError(errorMessage)
      return { error: errorMessage, canDelete: false, inUseBy }
    }

    const { error } = await supabase
      .from('mini_types')
      .delete()
      .eq('id', typeId)

    if (error) {
      setError(error.message)
      return { error: error.message, canDelete: false }
    }

    invalidateCache()
    return { error: null, canDelete: true }
  }

  async function updateTypeCategories(typeId: number, categoryIds: number[]) {
    setError('')

    // Delete existing relations
    const { error: deleteError } = await supabase
      .from('type_to_categories')
      .delete()
      .eq('type_id', typeId)

    if (deleteError) {
      setError(deleteError.message)
      return { error: deleteError.message }
    }

    // Insert new relations if any
    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('type_to_categories')
        .insert(
          categoryIds.map(categoryId => ({
            type_id: typeId,
            category_id: categoryId
          }))
        )

      if (insertError) {
        setError(insertError.message)
        return { error: insertError.message }
      }
    }

    // Invalidate cache and reload data
    invalidateCache()
    
    // Update the selected categories immediately
    setSelectedTypeCategories(categoryIds)
    
    // Reload cache and update all states
    const cacheData = await cache.loadData()
    setCategories(cacheData.categories)
    setMiniTypes(cacheData.types.slice(0, 10)) // Refresh first page of types
    
    return { error: null }
  }

  // Category CRUD operations
  const addCategory = async (name: string) => {
    try {
      if (!name || !name.trim()) {
        return { error: { message: 'Category name is required' } }
      }

      const { data: existingCategory, error: checkError } = await supabase
        .from('mini_categories')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing category:', checkError)
        return { error: checkError }
      }

      if (existingCategory) {
        return { error: { message: 'A category with this name already exists' } }
      }

      const { data, error } = await supabase
        .from('mini_categories')
        .insert({ name: name.trim() })
        .select()
        .single()

      if (error) {
        console.error('Error adding category:', error)
        return { error }
      }

      invalidateCache()
      return { data }
    } catch (error) {
      console.error('Unexpected error in addCategory:', error)
      return { error: { message: 'An unexpected error occurred' } }
    }
  }

  const editCategory = async (id: number, name: string) => {
    try {
      const { data, error } = await supabase
        .from('mini_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (!error) {
        invalidateCache()
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const checkCategoryUsage = async (categoryId: number) => {
    try {
      // Check if category is used in type_to_categories
      const { data: typeUsage, error: typeError } = await supabase
        .from('type_to_categories')
        .select('type_id')
        .eq('category_id', categoryId)
        .limit(1)

      if (typeError) {
        console.error('Error checking category usage:', typeError)
        return { error: typeError, canDelete: false }
      }

      return {
        canDelete: !typeUsage?.length,
        inUseBy: {
          types: typeUsage?.length > 0
        }
      }
    } catch (error) {
      console.error('Unexpected error in checkCategoryUsage:', error)
      return { error, canDelete: false }
    }
  }

  const deleteCategory = async (id: number) => {
    try {
      const { canDelete, error: checkError, inUseBy } = await checkCategoryUsage(id)
      
      if (checkError) {
        return { error: checkError }
      }

      if (!canDelete) {
        return { 
          error: { 
            message: `Cannot delete category because it is in use by ${inUseBy?.types ? 'types' : ''}`
          }
        }
      }

      const { error } = await supabase
        .from('mini_categories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting category:', error)
        return { error }
      }

      invalidateCache()
      return { error: null }
    } catch (error) {
      console.error('Unexpected error in deleteCategory:', error)
      return { error: { message: 'An unexpected error occurred while deleting the category' } }
    }
  }

  return {
    miniTypes,
    categories,
    selectedTypeCategories,
    totalCount,
    totalCategories,
    error,
    loadData,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories,
    checkTypeUsage,
    loadCategories,
    addCategory,
    editCategory,
    deleteCategory,
    checkCategoryUsage,
    invalidateCache
  }
} 