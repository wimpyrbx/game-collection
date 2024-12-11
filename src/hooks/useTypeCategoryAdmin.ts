import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MiniType, MiniCategory } from '../lib/supabase'

export function useTypeCategoryAdmin() {
  const [miniTypes, setMiniTypes] = useState<MiniType[]>([])
  const [categories, setCategories] = useState<MiniCategory[]>([])
  const [selectedTypeCategories, setSelectedTypeCategories] = useState<number[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: types } = await supabase
      .from('mini_types')
      .select('*')
      .order('name')
    
    const { data: cats } = await supabase
      .from('mini_categories')
      .select('*')
      .order('name')
    
    if (types) setMiniTypes(types)
    if (cats) setCategories(cats)
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

    const { error } = await supabase
      .from('mini_types')
      .insert([{ name: name.trim() }])
    
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

  async function deleteType(id: number) {
    setError('')
    
    // First check if type has any category relationships
    const { data: relationships } = await supabase
      .from('type_to_categories')
      .select('category_id')
      .eq('type_id', id)
    
    if (relationships && relationships.length > 0) {
      const error = `Cannot delete: This type has ${relationships.length} category relationship${relationships.length === 1 ? '' : 's'}`
      setError(error)
      return { error }
    }

    const { error } = await supabase
      .from('mini_types')
      .delete()
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
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
    error,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories
  }
} 