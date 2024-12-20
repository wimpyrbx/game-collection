// src/hooks/useProductAdmin.ts
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseMonitor'

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

interface Cache {
  companies: Company[]
  productLines: ProductLine[]
  productSets: ProductSet[]
  timestamp: number
  searchTerm: string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Singleton cache manager
class ProductCache {
  private static instance: ProductCache
  private cache: Cache | null = null
  private loadPromise: Promise<Cache> | null = null

  private constructor() {}

  static getInstance(): ProductCache {
    if (!ProductCache.instance) {
      ProductCache.instance = new ProductCache()
    }
    return ProductCache.instance
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
    console.log('Invalidating product cache')
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
      console.log('Fetching fresh product data')
      
      // Single query to fetch all related data, sorted at each level
      const { data, error } = await supabase
        .from('product_companies')
        .select(`
          id,
          name,
          product_lines:product_lines!company_id(
            id,
            name,
            company_id,
            product_sets:product_sets!product_line_id(
              id,
              name,
              product_line_id
            )
          )
        `)
        .order('name')

      if (error) throw error

      // Transform the nested data into flat arrays, sorting at each level
      const companies: Company[] = []
      const productLines: ProductLine[] = []
      const productSets: ProductSet[] = []

      data?.forEach((company: { id: any; name: any; product_lines: any }) => {
        companies.push({ id: company.id, name: company.name })
        
        // Sort product lines for this company
        const sortedLines = [...(company.product_lines || [])].sort((a, b) => 
          a.name.localeCompare(b.name)
        )
        
        sortedLines.forEach(line => {
          productLines.push({
            id: line.id,
            name: line.name,
            company_id: line.company_id
          })
          
          // Sort product sets for this line
          const sortedSets = [...(line.product_sets || [])].sort((a, b) => 
            a.name.localeCompare(b.name)
          )
          
          sortedSets.forEach(set => {
            productSets.push({
              id: set.id,
              name: set.name,
              product_line_id: set.product_line_id
            })
          })
        })
      })

      const newCache: Cache = {
        companies,
        productLines,
        productSets,
        timestamp: Date.now(),
        searchTerm: ''
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

  getCompanyLines(companyId: number): ProductLine[] {
    if (!this.cache) return []
    return this.cache.productLines.filter(line => line.company_id === companyId)
  }

  getLineSets(lineId: number): ProductSet[] {
    if (!this.cache) return []
    return this.cache.productSets.filter(set => set.product_line_id === lineId)
  }
}

export function useProductAdmin() {
  const [error, setError] = useState<string>('')
  const cache = ProductCache.getInstance()

  const invalidateCache = useCallback(() => {
    cache.invalidate()
  }, [])

  const filterAndPaginateData = useCallback((
    data: any[],
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

  const loadCompanies = async (offset: number, limit: number, search = '') => {
    try {
      if (!cache.isValid()) {
        await cache.loadData()
      }

      const cacheData = cache.data!
      
      // Skip filtering if no search term
      if (!search.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageCompanies = cacheData.companies.slice(startIndex, endIndex)
        
        return {
          data: pageCompanies,
          count: cacheData.companies.length
        }
      }

      const { items: pageCompanies, totalCount } = filterAndPaginateData(
        cacheData.companies,
        offset,
        limit,
        search
      )

      return {
        data: pageCompanies,
        count: totalCount
      }
    } catch (err) {
      console.error('Error loading companies:', err)
      return { data: [], count: 0 }
    }
  }

  const loadProductLines = async (companyId: number, offset: number, limit: number, search = '') => {
    try {
      if (!cache.isValid()) {
        await cache.loadData()
      }

      const companyLines = cache.getCompanyLines(companyId)
      
      // Skip filtering if no search term
      if (!search.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageLines = companyLines.slice(startIndex, endIndex)
        
        return {
          data: pageLines,
          count: companyLines.length
        }
      }

      const { items: pageLines, totalCount } = filterAndPaginateData(
        companyLines,
        offset,
        limit,
        search
      )

      return {
        data: pageLines,
        count: totalCount
      }
    } catch (err) {
      console.error('Error loading product lines:', err)
      return { data: [], count: 0 }
    }
  }

  const loadProductSets = async (lineId: number, offset: number, limit: number, search = '') => {
    try {
      if (!cache.isValid()) {
        await cache.loadData()
      }

      const lineSets = cache.getLineSets(lineId)
      
      // Skip filtering if no search term
      if (!search.trim()) {
        const startIndex = offset
        const endIndex = offset + limit
        const pageSets = lineSets.slice(startIndex, endIndex)
        
        return {
          data: pageSets,
          count: lineSets.length
        }
      }

      const { items: pageSets, totalCount } = filterAndPaginateData(
        lineSets,
        offset,
        limit,
        search
      )

      return {
        data: pageSets,
        count: totalCount
      }
    } catch (err) {
      console.error('Error loading product sets:', err)
      return { data: [], count: 0 }
    }
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

    invalidateCache()
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

    invalidateCache()
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

    invalidateCache()
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

    invalidateCache()
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

    invalidateCache()
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

    invalidateCache()
    return { data }
  }

  const checkCompanyUsage = async (companyId: number) => {
    if (!cache.isValid()) {
      await cache.loadData()
    }

    const companyLines = cache.getCompanyLines(companyId)
    return {
      canDelete: companyLines.length === 0,
      inUseBy: companyLines.length ? { lines: true } : null
    }
  }

  const checkLineUsage = async (lineId: number) => {
    if (!cache.isValid()) {
      await cache.loadData()
    }

    const lineSets = cache.getLineSets(lineId)
    return {
      canDelete: lineSets.length === 0,
      inUseBy: lineSets.length ? { sets: true } : null
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
    const { canDelete, inUseBy } = await checkCompanyUsage(id)
    
    if (inUseBy) {
      const errorMessage = 'Cannot delete company because it has product lines'
      setError(errorMessage)
      return { error: errorMessage }
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

    invalidateCache()
    return { error: null }
  }
  const deleteProductLine = async (id: number) => {
    const { canDelete, inUseBy } = await checkLineUsage(id)
    
    if (inUseBy) {
      const errorMessage = 'Cannot delete product line because it has product sets'
      setError(errorMessage)
      return { error: errorMessage }
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

    invalidateCache()
    return { error: null }
  }

  const deleteProductSet = async (id: number) => {
    const { canDelete, error: checkError } = await checkSetUsage(id)
    
    if (checkError) {
      setError(checkError)
      return { error: checkError }
    }

    if (!canDelete) {
      const errorMessage = `Cannot delete product set because it is in use`
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

    invalidateCache()
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
    deleteProductSet,
    invalidateCache
  }
}
