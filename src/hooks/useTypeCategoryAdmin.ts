import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseMonitor'
import type { MiniType, MiniCategory } from '../types/mini'

interface TypeCategoryRelation {
  type_id: number
  category_id: number
}

interface Cache {
  types: MiniType[]
  categories: MiniCategory[]
  typeCategoryRelations: TypeCategoryRelation[]
  timestamp: number
  searchTerm: string
  typesWithoutCategories: number
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

  private async fetchAllPages<T>(
    query: (page: number) => Promise<{ data: T[] | null; error: any }>,
    pageSize: number = 1000
  ): Promise<T[]> {
    let allData: T[] = []
    let page = 0
    
    while (true) {
      const { data, error } = await query(page)
      if (error) throw error
      if (!data || data.length === 0) break
      
      allData = [...allData, ...data]
      if (data.length < pageSize) break
      page++
    }
    
    return allData
  }

  async loadData(): Promise<Cache> {
    // If we're already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = (async () => {
      console.log('Fetching fresh type/category data')
      
      // Get all categories first in a single query
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('mini_categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError

      // Then get all types with their category relationships in a single query
      const { data: typesData, error: typesError } = await supabase
        .from('mini_types')
        .select(`
          id,
          name,
          type_to_categories!type_id(
            category_id
          )
        `)
        .order('name')

      if (typesError) throw typesError

      // Count types without categories
      const typesWithoutCategories = typesData.filter(
        type => !type.type_to_categories?.length
      ).length

      // Transform the data
      const types = typesData.map(type => ({
        id: type.id,
        name: type.name
      }))

      const typeCategoryRelations = typesData.flatMap(type => 
        (type.type_to_categories || []).map(rel => ({
          type_id: type.id,
          category_id: rel.category_id
        }))
      )

      const newCache: Cache = {
        types,
        categories: categoriesData,
        typeCategoryRelations,
        timestamp: Date.now(),
        searchTerm: '',
        typesWithoutCategories
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

  const filterAndPaginateData = useCallback((
    data: MiniType[] | MiniCategory[],
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
      
      const { items: pageTypes, totalCount: filteredCount } = filterAndPaginateData(
        cacheData.types,
        offset,
        limit,
        ''
      )
      
      setMiniTypes(pageTypes)
      setCategories(cacheData.categories)
      setTotalCount(filteredCount)
      setTotalCategories(cacheData.categories.length)
      
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

  async function loadData(offset: number = 0, limit: number = 10, search: string = '') {
    try {
      if (!cache.isValid()) {
        return initializeData(offset, limit)
      }

      const cacheData = cache.data!
      
      // Skip filtering if no search term
      if (!search.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageTypes = cacheData.types.slice(startIndex, endIndex)
        
        setMiniTypes(pageTypes)
        if (totalCount !== cacheData.types.length) {
          setTotalCount(cacheData.types.length)
        }
        
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
      
      setMiniTypes(pageTypes)
      if (totalCount !== filteredCount) {
        setTotalCount(filteredCount)
      }
      
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

      // Skip filtering if no search term
      if (!searchTerm?.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageCategories = cacheData.categories.slice(startIndex, endIndex)
        
        if (totalCategories !== cacheData.categories.length) {
          setTotalCategories(cacheData.categories.length)
        }

        return { 
          data: pageCategories, 
          count: cacheData.categories.length 
        }
      }

      const { items: pageCategories, totalCount: filteredCount } = filterAndPaginateData(
        cacheData.categories,
        offset,
        limit,
        searchTerm
      )

      if (totalCategories !== filteredCount) {
        setTotalCategories(filteredCount)
      }

      return { 
        data: pageCategories, 
        count: filteredCount 
      }
    } catch (error) {
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