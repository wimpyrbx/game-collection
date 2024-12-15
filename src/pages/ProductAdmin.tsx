import { useState, useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import * as UI from '../components/ui'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { FaBuilding, FaList, FaListAlt, FaArchive, FaExclamationTriangle } from 'react-icons/fa'

import { useProductAdmin } from '../hooks/useProductAdmin'
import { ProductLineModal, ProductSetModal, ProductCompanyModal } from '../components/productadmin'
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

export default function ProductAdmin() {
  // Consolidated state
  const [state, setState] = useState<{
    companies: Company[]
    productLines: ProductLine[]
    productSets: ProductSet[]
    totals: {
      companies: number
      lines: number
      sets: number
    }
    overallTotals: {
      companies: number
      lines: number
      sets: number
    }
    selected: {
      company: Company | null
      line: ProductLine | null
      set: ProductSet | null
    }
    modal: {
      type: 'addCompany' | 'editCompany' | 'deleteCompany' | 
            'addLine' | 'editLine' | 'deleteLine' |
            'addSet' | 'editSet' | 'deleteSet' | null
      isOpen: boolean
      data?: any
    }
  }>({
    companies: [],
    productLines: [],
    productSets: [],
    totals: { companies: 0, lines: 0, sets: 0 },
    overallTotals: { companies: 0, lines: 0, sets: 0 },
    selected: { company: null, line: null, set: null },
    modal: { type: null, isOpen: false }
  })

  // Admin hooks
  const companyPagination = useAdminPagination({ 
    itemsPerPage: 10,
    totalItems: state.totals.companies 
  })
  const companySearch = useAdminSearch({ searchFields: ['name'] })
  const linePagination = useAdminPagination({ 
    itemsPerPage: 10,
    totalItems: state.totals.lines 
  })
  const lineSearch = useAdminSearch({ searchFields: ['name'] })
  const setPagination = useAdminPagination({ 
    itemsPerPage: 10,
    totalItems: state.totals.sets 
  })
  const setSearch = useAdminSearch({ searchFields: ['name'] })
  const loading = useAdminLoading()

  const {
    loadCompanies,
    loadProductLines,
    loadProductSets,
    addCompany,
    addProductLine,
    addProductSet,
    editCompany,
    editProductLine,
    editProductSet,
    deleteCompany,
    deleteProductLine,
    deleteProductSet
  } = useProductAdmin()

  const { showSuccess, showError } = useNotifications()

  // Generic refresh function
  const refresh = async (type: 'companies' | 'lines' | 'sets') => {
    try {
      let result: { error?: any; data: any; count: any }
      switch (type) {
        case 'companies':
          result = await loading.withLoading(
            loadCompanies(
              (companyPagination.currentPage - 1) * companyPagination.itemsPerPage,
              companyPagination.itemsPerPage,
              companySearch.searchTerm
            )
          )
          if (result.error) throw new Error(result.error)
          setState(prev => ({
            ...prev,
            companies: result.data || [],
            totals: { ...prev.totals, companies: result.count || 0 }
          }))
          break

        case 'lines':
          if (!state.selected.company) return
          result = await loading.withLoading(
            loadProductLines(
              state.selected.company.id,
              (linePagination.currentPage - 1) * linePagination.itemsPerPage,
              linePagination.itemsPerPage,
              lineSearch.searchTerm
            )
          )
          if (result.error) throw new Error(result.error)
          setState(prev => ({
            ...prev,
            productLines: result.data || [],
            totals: { ...prev.totals, lines: result.count || 0 }
          }))
          break

        case 'sets':
          if (!state.selected.line) return
          result = await loading.withLoading(
            loadProductSets(
              state.selected.line.id,
              (setPagination.currentPage - 1) * setPagination.itemsPerPage,
              setPagination.itemsPerPage,
              setSearch.searchTerm
            )
          )
          if (result.error) throw new Error(result.error)
          setState(prev => ({
            ...prev,
            productSets: result.data || [],
            totals: { ...prev.totals, sets: result.count || 0 }
          }))
          break
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        showError(`Failed to load ${type}: ${error.message}`)
      } else {
        showError(`Failed to load ${type}: Unknown error occurred`)
      }
    }
  }

  // Load overall totals
  const loadOverallTotals = async () => {
    try {
      const [companiesResult, linesResult, setsResult] = await Promise.all([
        supabase.from('product_companies').select('*', { count: 'exact', head: true }),
        supabase.from('product_lines').select('*', { count: 'exact', head: true }),
        supabase.from('product_sets').select('*', { count: 'exact', head: true })
      ])

      setState(prev => ({
        ...prev,
        overallTotals: {
          companies: companiesResult.count || 0,
          lines: linesResult.count || 0,
          sets: setsResult.count || 0
        }
      }))
    } catch (error) {
      console.error('Error loading overall totals:', error)
      showError('Failed to load overall totals')
    }
  }

  // Load data effects
  useEffect(() => {
    loadOverallTotals()
  }, [])

  useEffect(() => {
    refresh('companies')
  }, [companyPagination.currentPage, companySearch.searchTerm])

  useEffect(() => {
    if (state.selected.company) {
      refresh('lines')
    } else {
      setState(prev => ({
        ...prev,
        productLines: [],
        selected: { ...prev.selected, line: null }
      }))
    }
  }, [state.selected.company, linePagination.currentPage, lineSearch.searchTerm])

  useEffect(() => {
    if (state.selected.line) {
      refresh('sets')
    } else {
      setState(prev => ({
        ...prev,
        productSets: [],
        selected: { ...prev.selected, set: null }
      }))
    }
  }, [state.selected.line, setPagination.currentPage, setSearch.searchTerm])

  // Add these helper functions at the top level of the file, before the component
  const canDeleteCompany = async (id: number) => {
    const { data, error } = await supabase
      .from('product_lines')
      .select('id')
      .eq('company_id', id)
      .limit(1)
    
    if (error) throw error
    return data.length === 0
  }

  const canDeleteProductLine = async (id: number) => {
    const { data, error } = await supabase
      .from('product_sets')
      .select('id')
      .eq('product_line_id', id)
      .limit(1)
    
    if (error) throw error
    return data.length === 0
  }

  const canDeleteProductSet = async (id: number) => {
    const { data, error } = await supabase
      .from('minis')
      .select('id')
      .eq('product_set_id', id)
      .limit(1)
    
    if (error) throw error
    return data.length === 0
  }

  // Replace the existing handleModalAction function with this updated version
  const handleModalAction = async (action: string, data?: any) => {
    try {
      let result
      switch (action) {
        case 'addCompany':
          result = await loading.withLoading(addCompany(data))
          if (result.error) throw new Error(result.error)
          showSuccess('Company added successfully')
          refresh('companies')
          loadOverallTotals()
          break

        case 'editCompany':
          result = await loading.withLoading(editCompany(state.modal.data.id, data))
          if (result.error) throw new Error(result.error)
          showSuccess('Company updated successfully')
          refresh('companies')
          break

        case 'deleteCompany': {
          const canDelete = await canDeleteCompany(state.modal.data.id)
          if (!canDelete) {
            showError('Cannot delete company because it has product lines associated with it')
            setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))
            return
          }
          result = await loading.withLoading(deleteCompany(state.modal.data.id))
          if (result.error) throw new Error(result.error)
          showSuccess('Company deleted successfully')
          if (state.selected.company?.id === state.modal.data.id) {
            setState(prev => ({
              ...prev,
              selected: { ...prev.selected, company: null }
            }))
          }
          refresh('companies')
          loadOverallTotals()
          break
        }

        case 'addLine':
          if (!state.selected.company) return
          result = await loading.withLoading(addProductLine(
            String(data?.name || data),
            state.selected.company.id
          ))
          if (result.error) throw new Error(result.error)
          showSuccess('Product line added successfully')
          refresh('lines')
          break

        case 'editLine':
          result = await loading.withLoading(editProductLine(state.modal.data.id, String(data?.name || data)))
          if (result.error) throw new Error(result.error)
          showSuccess('Product line updated successfully')
          refresh('lines')
          break

        case 'deleteLine': {
          const canDelete = await canDeleteProductLine(state.modal.data.id)
          if (!canDelete) {
            showError('Cannot delete product line because it has product sets associated with it')
            setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))
            return
          }
          result = await loading.withLoading(deleteProductLine(state.modal.data.id))
          if (result.error) throw new Error(result.error)
          showSuccess('Product line deleted successfully')
          if (state.selected.line?.id === state.modal.data.id) {
            setState(prev => ({
              ...prev,
              selected: { ...prev.selected, line: null }
            }))
          }
          refresh('lines')
          break
        }

        case 'addSet':
          if (!state.selected.line) return
          result = await loading.withLoading(addProductSet(
            String(data?.name || data),
            state.selected.line.id
          ))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set added successfully')
          refresh('sets')
          loadOverallTotals()
          break

        case 'editSet':
          result = await loading.withLoading(editProductSet(state.modal.data.id, String(data?.name || data)))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set updated successfully')
          refresh('sets')
          break

        case 'deleteSet': {
          const canDelete = await canDeleteProductSet(state.modal.data.id)
          if (!canDelete) {
            showError('Cannot delete product set because it has miniatures associated with it')
            setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))
            return
          }
          result = await loading.withLoading(deleteProductSet(state.modal.data.id))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set deleted successfully')
          if (state.selected.set?.id === state.modal.data.id) {
            setState(prev => ({
              ...prev,
              selected: { ...prev.selected, set: null }
            }))
          }
          refresh('sets')
          loadOverallTotals()
          break
        }
      }
      setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : String(error))
    }
  }

  const handleDelete = async (type: 'company' | 'line' | 'set', item: any) => {
    try {
      let canDelete = false
      let modalType: typeof state.modal.type = null
      
      switch (type) {
        case 'company':
          canDelete = await canDeleteCompany(item.id)
          if (!canDelete) {
            showError('Cannot delete company because it has product lines associated with it')
            return
          }
          modalType = 'deleteCompany'
          break
          
        case 'line':
          canDelete = await canDeleteProductLine(item.id)
          if (!canDelete) {
            showError('Cannot delete product line because it has product sets associated with it')
            return
          }
          modalType = 'deleteLine'
          break
          
        case 'set':
          canDelete = await canDeleteProductSet(item.id)
          if (!canDelete) {
            showError('Cannot delete product set because it has miniatures associated with it')
            return
          }
          modalType = 'deleteSet'
          break
      }

      // If we get here, we can delete, so show the confirmation modal
      setState(prev => ({
        ...prev,
        modal: { type: modalType, isOpen: true, data: item }
      }))
    } catch (error) {
      showError('Error checking delete constraints')
    }
  }

  return (
    <>
      <PageHeader bgColor="none">
            <PageHeaderTextGroup> 
              <PageHeaderText>Product Companies, Lines and Sets</PageHeaderText>
              <PageHeaderSubText>Manage your collection of product companies, lines, and sets</PageHeaderSubText>
            </PageHeaderTextGroup>
              <PageHeaderBigNumber
                icon={FaArchive}
                number={state.overallTotals.companies}
                text="Total Companies"
              />
              <PageHeaderBigNumber
                icon={FaList}
                number={state.overallTotals.lines}
                text="Total Product Lines"
              />
              <PageHeaderBigNumber
                icon={FaListAlt}
                number={state.overallTotals.sets}
                text="Total Product Sets"
              />
          
      </PageHeader>

      <div className="grid grid-cols-12 gap-4">
        {/* Companies Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Companies"
            icon={FaBuilding}
            iconColor="text-yellow-600"
            items={state.companies}
            headerSubText="Manage companies"
            headerItalicText="* This section is for managing companies"
            selectedItem={state.selected.company}
            onSelect={(company) => setState(prev => ({
              ...prev,
              selected: { ...prev.selected, company }
            }))}
            onAdd={() => setState(prev => ({
              ...prev,
              modal: { type: 'addCompany', isOpen: true }
            }))}
            onEdit={(company) => setState(prev => ({
              ...prev,
              modal: { type: 'editCompany', isOpen: true, data: company }
            }))}
            onDelete={(company) => handleDelete('company', company)}
            loading={loading.isLoading}
            searchProps={{
              ...companySearch.searchProps,
              placeholder: "Search companies..."
            }}
            pagination={{
              currentPage: companyPagination.currentPage,
              totalItems: state.totals.companies,
              itemsPerPage: companyPagination.itemsPerPage,
              onPageChange: companyPagination.handlePageChange
            }}
            getItemName={(item) => item.name}
          />
        </div>

        {/* Product Lines Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Product Lines"
            icon={FaList}
            iconColor="text-cyan-600"
            items={state.productLines}
            selectedItem={state.selected.line}
            onSelect={(line) => setState(prev => ({
              ...prev,
              selected: { ...prev.selected, line }
            }))}
            onAdd={() => setState(prev => ({
              ...prev,
              modal: { type: 'addLine', isOpen: true }
            }))}
            onEdit={(line) => setState(prev => ({
              ...prev,
              modal: { type: 'editLine', isOpen: true, data: line }
            }))}
            onDelete={(line) => handleDelete('line', line)}
            loading={loading.isLoading}
            addButtonDisabled={!state.selected.company}
            headerSubText={`Selected company: ${state.selected.company?.name || 'None'}`}
            headerItalicText={!state.selected.company 
              ? "* Select a company to manage its product lines" 
              : `${state.productLines.length} product line${state.productLines.length === 1 ? '' : 's'}`
            }
            emptyMessage={!state.selected.company ? "* Select a company to view product lines" : "No product lines found"}
            searchProps={{
              ...lineSearch.searchProps,
              placeholder: "Search product lines..."
            }}
            pagination={{
              currentPage: linePagination.currentPage,
              totalItems: state.totals.lines,
              itemsPerPage: linePagination.itemsPerPage,
              onPageChange: linePagination.handlePageChange
            }}
            getItemName={(item) => item.name}
          />
        </div>

        {/* Product Sets Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Product Sets"
            icon={FaListAlt}
            iconColor="text-white"
            items={state.productSets}
            selectedItem={state.selected.set}
            onSelect={(set) => setState(prev => ({
              ...prev,
              selected: { ...prev.selected, set }
            }))}
            onAdd={() => setState(prev => ({
              ...prev,
              modal: { type: 'addSet', isOpen: true }
            }))}
            onEdit={(set) => setState(prev => ({
              ...prev,
              modal: { type: 'editSet', isOpen: true, data: set }
            }))}
            onDelete={(set) => handleDelete('set', set)}
            loading={loading.isLoading}
            addButtonDisabled={!state.selected.line}
            headerSubText={`Selected line: ${state.selected.line?.name || 'None'}`}
            headerItalicText={!state.selected.line 
              ? "Select a product line to manage its sets" 
              : `${state.productSets.length} set${state.productSets.length === 1 ? '' : 's'}`
            }
            emptyMessage={!state.selected.line ? "Select a product line to view sets" : "No product sets found"}
            searchProps={{
              ...setSearch.searchProps,
              placeholder: "Search product sets..."
            }}
            pagination={{
              currentPage: setPagination.currentPage,
              totalItems: state.totals.sets,
              itemsPerPage: setPagination.itemsPerPage,
              onPageChange: setPagination.handlePageChange
            }}
            getItemName={(item) => item.name}
          />
        </div>

        {/* Modals */}
        <ProductCompanyModal
          isOpen={['addCompany', 'editCompany'].includes(state.modal.type || '')}
          onClose={() => setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))}
          onSubmit={(name) => handleModalAction(state.modal.type || '', name)}
          company={state.modal.type === 'editCompany' ? state.modal.data : null}
          isLoading={loading.isLoading}
        />

        <ProductLineModal
          isOpen={['addLine', 'editLine'].includes(state.modal.type || '')}
          onClose={() => setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))}
          onSubmit={(name) => handleModalAction(state.modal.type || '', name)}
          productLine={state.modal.type === 'editLine' ? state.modal.data : null}
          isLoading={loading.isLoading}
        />

        <ProductSetModal
          isOpen={['addSet', 'editSet'].includes(state.modal.type || '')}
          onClose={() => setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))}
          onSubmit={(name) => handleModalAction(state.modal.type || '', name)}
          productSet={state.modal.type === 'editSet' ? state.modal.data : null}
          isLoading={loading.isLoading}
        />

        <UI.DeleteConfirmModal
          isOpen={state.modal.type?.startsWith('delete') || false}
          icon={FaExclamationTriangle}
          iconColor="text-red-500"
          onClose={() => setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))}
          onConfirm={() => handleModalAction(state.modal.type || '')}
          title="Delete Confirmation"
          message={`Are you sure you want to delete "${state.modal.data?.name}"? This action cannot be undone.`}
          isLoading={loading.isLoading}
        />
      </div>
    </>
  )
}