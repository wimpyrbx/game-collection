// src/hooks/useProductAdmin.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ProductGroup {
  id: number
  name: string
  description: string | null
}

interface ProductType {
  id: number
  name: string
  description: string | null
}

export function useProductAdmin() {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: groups } = await supabase.from('product_groups').select('*')
    const { data: types } = await supabase.from('product_types').select('*')
    if (groups) setProductGroups(groups)
    if (types) setProductTypes(types)
  }

  async function addProductGroup(name: string, description: string) {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { error } = await supabase
      .from('product_groups')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true
      }])
      .select()
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
  }

  async function addProductType(name: string, description: string) {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { error } = await supabase
      .from('product_types')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true
      }])
      .select()
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
  }

  async function deleteGroup(id: number) {
    setError('')
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('product_group_id', id)
    
    if (products && products.length > 0) {
      const error = `Cannot delete: ${products.length} products are using this group`
      setError(error)
      return { error }
    }

    const { error } = await supabase
      .from('product_groups')
      .delete()
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
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('product_type_id', id)
    
    if (products && products.length > 0) {
      const error = `Cannot delete: ${products.length} products are using this type`
      setError(error)
      return { error }
    }

    const { error } = await supabase
      .from('product_types')
      .delete()
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
  }

  async function updateGroup(id: number, updates: Partial<ProductGroup>) {
    setError('')
    if (!updates.name?.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { error } = await supabase
      .from('product_groups')
      .update({
        name: updates.name.trim(),
        description: updates.description?.trim() || null
      })
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
  }

  async function updateType(id: number, updates: Partial<ProductType>) {
    setError('')
    if (!updates.name?.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { error } = await supabase
      .from('product_types')
      .update({
        name: updates.name.trim(),
        description: updates.description?.trim() || null
      })
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    loadData()
    return { error: null }
  }

  return {
    productGroups,
    productTypes,
    error,
    setError,
    addProductGroup,
    addProductType,
    deleteGroup,
    deleteType,
    updateGroup,
    updateType
  }
}

export type { ProductGroup, ProductType }
