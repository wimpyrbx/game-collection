// src/hooks/useProductAdmin.ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Company {
  id: number
  name: string
  description?: string
}

interface ProductLine {
  id: number
  name: string
  company_id: number
  description?: string
}

interface ProductSet {
  id: number
  name: string
  product_line_id: number
  description?: string
}

export function useProductAdmin() {
  const [error, setError] = useState<string>('')

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('product_companies')
      .select('id, name')
      .order('name')
    
    if (error) throw error
    return data
  }

  const loadProductLines = async (companyId: number) => {
    const { data, error } = await supabase
      .from('product_lines')
      .select('id, name, company_id')
      .eq('company_id', companyId)
      .order('name')
    
    if (error) throw error
    return data
  }

  const loadProductSets = async (lineId: number) => {
    const { data, error } = await supabase
      .from('product_sets')
      .select('id, name, product_line_id')
      .eq('product_line_id', lineId)
      .order('name')
    
    if (error) throw error
    return data
  }

  const addCompany = async (name: string, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_companies')
      .insert([{ name: name.trim(), description: description?.trim() }])
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const addProductLine = async (name: string, companyId: number, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_lines')
      .insert([{ 
        name: name.trim(), 
        company_id: companyId,
        description: description?.trim()
      }])
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const addProductSet = async (name: string, lineId: number, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_sets')
      .insert([{ 
        name: name.trim(), 
        product_line_id: lineId,
        description: description?.trim()
      }])
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const editCompany = async (id: number, name: string, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_companies')
      .update({ 
        name: name.trim(), 
        description: description?.trim() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const editProductLine = async (id: number, name: string, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_lines')
      .update({ 
        name: name.trim(), 
        description: description?.trim() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const editProductSet = async (id: number, name: string, description?: string) => {
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return { error: 'Name is required' }
    }

    const { data, error } = await supabase
      .from('product_sets')
      .update({ 
        name: name.trim(), 
        description: description?.trim() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { data }
  }

  const checkCompanyUsage = async (companyId: number) => {
    const { data, error } = await supabase
      .from('product_lines')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)

    if (error) {
      setError(error.message)
      return { canDelete: false, error: error.message }
    }

    return {
      canDelete: !data?.length,
      inUseBy: data?.length ? { lines: true } : null
    }
  }

  const checkLineUsage = async (lineId: number) => {
    const { data, error } = await supabase
      .from('product_sets')
      .select('id')
      .eq('product_line_id', lineId)
      .limit(1)

    if (error) {
      setError(error.message)
      return { canDelete: false, error: error.message }
    }

    return {
      canDelete: !data?.length,
      inUseBy: data?.length ? { sets: true } : null
    }
  }

  const checkSetUsage = async (setId: number) => {
    const { data, error } = await supabase
      .from('minis')
      .select('id')
      .eq('product_set_id', setId)
      .limit(1)

    if (error) {
      setError(error.message)
      return { canDelete: false, error: error.message }
    }

    return {
      canDelete: !data?.length,
      inUseBy: data?.length ? { minis: true } : null
    }
  }

  const deleteCompany = async (id: number) => {
    const { canDelete, inUseBy, error: checkError } = await checkCompanyUsage(id)
    
    if (checkError) {
      setError(checkError)
      return { error: checkError }
    }

    if (!canDelete) {
      const errorMessage = `Cannot delete company because it has product lines`
      setError(errorMessage)
      return { error: errorMessage }
    }

    const { error } = await supabase
      .from('product_companies')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { error: null }
  }

  const deleteProductLine = async (id: number) => {
    const { canDelete, inUseBy, error: checkError } = await checkLineUsage(id)
    
    if (checkError) {
      setError(checkError)
      return { error: checkError }
    }

    if (!canDelete) {
      const errorMessage = `Cannot delete product line because it has product sets`
      setError(errorMessage)
      return { error: errorMessage }
    }

    const { error } = await supabase
      .from('product_lines')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { error: null }
  }

  const deleteProductSet = async (id: number) => {
    const { canDelete, inUseBy, error: checkError } = await checkSetUsage(id)
    
    if (checkError) {
      setError(checkError)
      return { error: checkError }
    }

    if (!canDelete) {
      const errorMessage = `Cannot delete product set because it has minis`
      setError(errorMessage)
      return { error: errorMessage }
    }

    const { error } = await supabase
      .from('product_sets')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    return { error: null }
  }

  return {
    error,
    loadCompanies,
    loadProductLines,
    loadProductSets,
    addCompany,
    addProductLine,
    addProductSet,
    editCompany,
    editProductLine,
    editProductSet,
    checkCompanyUsage,
    checkLineUsage,
    checkSetUsage,
    deleteCompany,
    deleteProductLine,
    deleteProductSet
  }
}
