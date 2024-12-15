import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MiniType, MiniCategory } from '../types/mini'

export function useTypeCategoryAdmin() {
  const [miniTypes, setMiniTypes] = useState<MiniType[]>([])
  const [categories, setCategories] = useState<MiniCategory[]>([])
  const [selectedTypeCategories, setSelectedTypeCategories] = useState<number[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData(offset: number = 0, limit: number = 10, search: string = '') {
    setCurrentPaginationState({ offset, limit, search })
    
    try {
      let query = supabase
        .from('mini_types')
        .select('*', { count: 'exact' })
      
      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      
      const { data: types, error: typesError, count } = await query
        .range(offset, offset + limit - 1)
        .order('name')

      if (typesError) throw typesError

      const { data: cats, error: catsError } = await supabase
        .from('mini_categories')
        .select('*')
        .order('name')

      if (catsError) throw catsError

      if (types) setMiniTypes(types)
      if (cats) setCategories(cats)
      if (count !== null) setTotalCount(count)

      // Get count of types without categories
      const { count: typesWithoutCategories } = await supabase
        .from('mini_types')
        .select('id, type_to_categories(*)', { 
          count: 'exact',
          head: true 
        })
        .is('type_to_categories', null);

      return { 
        data: types || [], 
        count, 
        typesWithoutCategories: typesWithoutCategories || 0
      }
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: [], count: 0, error: errorMessage }
    }
  }

  async function loadTypeCategoryIds(typeId: number) {
    const { data, error } = await supabase
      .from('type_to_categories')
      .select('category_id')
      .eq('type_id', typeId)
    
    if (error) {
      return { error: error.message }
    }
    
    setSelectedTypeCategories(data?.map(item => item.category_id) || [])
    return { error: null }
  }

  async function addType(name: string) {
    try {
      // First check if name already exists
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

      // Reload data with current pagination state
      const { offset, limit, search } = getCurrentPaginationState()
      await loadData(offset, limit, search)
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

    // Reload data with current pagination state
    const { offset, limit, search } = getCurrentPaginationState()
    await loadData(offset, limit, search)
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
    // First check if type can be deleted
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

    // Reload data with current pagination state
    const { offset, limit, search } = getCurrentPaginationState()
    await loadData(offset, limit, search)
    return { error: null, canDelete: true }
  }

  async function updateTypeCategories(typeId: number, categoryIds: number[]) {
    setError('')

    // Delete existing relationships
    await supabase
      .from('type_to_categories')
      .delete()
      .eq('type_id', typeId)

    // Add new relationships
    if (categoryIds.length > 0) {
      const { error } = await supabase
        .from('type_to_categories')
        .insert(
          categoryIds.map(categoryId => ({
            type_id: typeId,
            category_id: categoryId
          }))
        )

      if (error) {
        setError(error.message)
        return { error: error.message }
      }
    }

    loadTypeCategoryIds(typeId)
    return { error: null }
  }

  // Add state for current pagination
  const [currentPaginationState, setCurrentPaginationState] = useState({
    offset: 0,
    limit: 10,
    search: ''
  })

  function getCurrentPaginationState() {
    return currentPaginationState
  }

  // Category CRUD operations
  const loadCategories = async (
    offset: number,
    limit: number,
    searchTerm?: string
  ) => {
    try {
      let query = supabase
        .from('mini_categories')
        .select('*', { count: 'exact' })

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('name')

      return { data, error, count }
    } catch (error) {
      return { data: null, error, count: 0 }
    }
  }

  const addCategory = async (name: string) => {
    try {
      if (!name || !name.trim()) {
        return { error: { message: 'Category name is required' } }
      }

      // First check if name already exists
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
      // First check if category can be deleted
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
    checkCategoryUsage
  }
} 