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

  async function loadData(page: number = 1, pageSize: number = 10, search: string = '') {
    
    const { count } = await supabase
      .from('mini_types')
      .select('*', { count: 'exact', head: true })
      .ilike('name', `%${search}%`)

    const { data: types } = await supabase
      .from('mini_types')
      .select('*')
      .ilike('name', `%${search}%`)
      .order('name')
      .range((page - 1) * pageSize, page * pageSize - 1)
    
    const { data: cats } = await supabase
      .from('mini_categories')
      .select('*')
      .order('name')
    
    if (types) setMiniTypes(types)
    if (cats) setCategories(cats)
    if (count !== null) setTotalCount(count)

    const result = {
      miniTypes: types || [],
      totalCount: count || 0
    }
    return result
  }

  async function loadTypeCategoryIds(typeId: number) {
    const { data } = await supabase
      .from('type_to_categories')
      .select('category_id')
      .eq('type_id', typeId)
    
    setSelectedTypeCategories(data?.map(item => item.category_id) || [])
  }

  async function addType(name: string) {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    // First check if name already exists
    const checkQuery = supabase
      .from('mini_types')
      .select('name')
      .ilike('name', name.trim())
      .single()

    const { data: existingType } = await checkQuery

    if (existingType) {
      const error = 'A type with this name already exists'
      setError(error)
      return { error }
    }

    const insertQuery = supabase
      .from('mini_types')
      .insert([{ name: name.trim() }])

    const { data, error } = await insertQuery
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
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

    loadData()
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

    loadData()
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