import { useState, useEffect } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import * as UI from '../components/ui'
import { ProductLineModal, ProductSetModal, ProductCompanyModal } from '../components/productadmin'
import { FaBuilding, FaList, FaListAlt } from 'react-icons/fa'

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
  const refresh = async (type: 'companies' | 'lines' | 'sets', params?: any) => {
    try {
      let result
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
    } catch (error) {
      showError(`Failed to load ${type}: ${error.message}`)
    }
  }

  // Load data effects
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

  // Generic modal action handler
  const handleModalAction = async (action: string, data?: any) => {
    try {
      let result
      switch (action) {
        case 'addCompany':
          result = await loading.withLoading(addCompany(data))
          if (result.error) throw new Error(result.error)
          showSuccess('Company added successfully')
          refresh('companies')
          break

        case 'editCompany':
          result = await loading.withLoading(editCompany(state.modal.data.id, data))
          if (result.error) throw new Error(result.error)
          showSuccess('Company updated successfully')
          refresh('companies')
          break

        case 'deleteCompany':
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
          break

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

        case 'deleteLine':
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

        case 'addSet':
          if (!state.selected.line) return
          result = await loading.withLoading(addProductSet(
            String(data?.name || data),
            state.selected.line.id
          ))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set added successfully')
          refresh('sets')
          break

        case 'editSet':
          result = await loading.withLoading(editProductSet(state.modal.data.id, String(data?.name || data)))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set updated successfully')
          refresh('sets')
          break

        case 'deleteSet':
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
          break
      }
      setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))
    } catch (error) {
      showError(error.message)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Companies Section */}
      <div className="col-span-4">
        <UI.AdminTableSection
          title="Companies"
          icon={FaBuilding}
          items={state.companies}
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
          onDelete={(company) => setState(prev => ({
            ...prev,
            modal: { type: 'deleteCompany', isOpen: true, data: company }
          }))}
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
          onDelete={(line) => setState(prev => ({
            ...prev,
            modal: { type: 'deleteLine', isOpen: true, data: line }
          }))}
          loading={loading.isLoading}
          addButtonDisabled={!state.selected.company}
          headerSubText={`Selected company: ${state.selected.company?.name || 'None'}`}
          headerItalicText={!state.selected.company 
            ? "Select a company to manage its product lines" 
            : `${state.productLines.length} product line${state.productLines.length === 1 ? '' : 's'}`
          }
          emptyMessage={!state.selected.company ? "Select a company to view product lines" : "No product lines found"}
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
          onDelete={(set) => setState(prev => ({
            ...prev,
            modal: { type: 'deleteSet', isOpen: true, data: set }
          }))}
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
        onClose={() => setState(prev => ({ ...prev, modal: { type: null, isOpen: false } }))}
        onConfirm={() => handleModalAction(state.modal.type || '')}
        title={`Delete ${state.modal.type?.replace('delete', '')}`}
        message={`Are you sure you want to delete this ${state.modal.type?.replace('delete', '').toLowerCase()}?`}
        itemName={state.modal.data?.name || ''}
        isLoading={loading.isLoading}
      />
    </div>
  )
}