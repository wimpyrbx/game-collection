import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MiniType, MiniCategory } from '../lib/supabase'

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

      return { data: types || [], count }
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { data: [], count: 0, error: errorMessage }
    }
  }

  async function loadTypeCategoryIds(typeId: number) {
    const { data } = await supabase
      .from('type_to_categories')
      .select('category_id')
      .eq('type_id', typeId)
    
    setSelectedTypeCategories(data?.map(item => item.category_id) || [])
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
    checkTypeUsage
  }
} 