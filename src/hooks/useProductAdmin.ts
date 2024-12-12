// src/hooks/useProductAdmin.ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

export function useProductAdmin() {
  const [error, setError] = useState<string>('')

  const loadCompanies = async (offset: number, limit: number, search = '') => {
    let query = supabase
      .from('product_companies')
      .select('*', { count: 'exact' })
      
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('name')

    if (error) {
      console.error('Error loading companies:', error)
      return { data: [], count: 0 }
    }

    return { data, count }
  }

  const loadProductLines = async (companyId: number) => {
    const { data, error } = await supabase
      .from('product_lines')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    
    if (error) {
      console.error('Error loading product lines:', error)
      return []
    }

    return data || []
  }

  const loadProductSets = async (lineId: number) => {
    const { data, error } = await supabase
      .from('product_sets')
      .select('*')
      .eq('product_line_id', lineId)
      .order('name')
    
    if (error) {
      console.error('Error loading product sets:', error)
      return []
    }

    return data || []
  }

  const addCompany = async (name: string) => {
    const { data, error } = await supabase
      .from('product_companies')
      .insert([{ name: name.trim() }])
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  }

  const addProductLine = async (name: string, companyId: number) => {
    const { data, error } = await supabase
      .from('product_lines')
      .insert([{ 
        name: name.trim(),
        company_id: companyId
      }])
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  }

  const addProductSet = async (name: string, lineId: number) => {
    const { data, error } = await supabase
      .from('product_sets')
      .insert([{ 
        name: name.trim(),
        product_line_id: lineId
      }])
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  }

  const editCompany = async (id: number, name: string) => {
    const { data, error } = await supabase
      .from('product_companies')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  }

  const editProductLine = async (id: number, name: string) => {
    const { data, error } = await supabase
      .from('product_lines')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  }

  const editProductSet = async (id: number, name: string) => {
    const { data, error } = await supabase
      .from('product_sets')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
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
