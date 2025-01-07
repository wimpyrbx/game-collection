import { useState, useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import * as UI from '../components/ui'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui/pageheader/PageHeader'
import { FaBuilding, FaList, FaListAlt, FaFileImport, FaTrashAlt } from 'react-icons/fa'
import { DeleteConfirmModal } from '../components/ui/modal'

import { useProductAdmin } from '../hooks/useProductAdmin'
import { ProductLineModal, ProductSetModal, ProductCompanyModal, ImportProductSetsModal } from '../components/productadmin'
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

// Add new interfaces for hover state
interface HoverPosition {
  x: number
  y: number
  show: boolean
  company: string | null
}

export default function ProductAdmin() {
  // Add hover state
  const [hoverPosition, setHoverPosition] = useState<HoverPosition>({
    x: 0,
    y: 0,
    show: false,
    company: null
  })

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
            'addSet' | 'editSet' | 'deleteSet' | 'importSets' | null
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
  const isLoading = loading.isLoading || false

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
          result = await loading.withLoading(addProductLine(data, state.selected.company.id))
          if (result.error) throw new Error(result.error)
          showSuccess('Product line added successfully')
          refresh('lines')
          loadOverallTotals()
          break

        case 'editLine':
          result = await loading.withLoading(editProductLine(state.modal.data.id, data))
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
          loadOverallTotals()
          break
        }

        case 'addSet':
          if (!state.selected.line) return
          result = await loading.withLoading(addProductSet(data, state.selected.line.id))
          if (result.error) throw new Error(result.error)
          showSuccess('Product set added successfully')
          refresh('sets')
          loadOverallTotals()
          break

        case 'editSet':
          result = await loading.withLoading(editProductSet(state.modal.data.id, data))
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

        case 'importSets':
          // Implementation for importing sets
          break
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

  // Add mouse move handler
  const handleMouseMove = (e: React.MouseEvent, companyName: string) => {
    // Get the target element's bounding rect to account for any offsets
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Calculate position relative to the element
    const x = e.clientX - rect.left
    const sidebarWidth = 350
    
    setHoverPosition({
      x: rect.left + x - sidebarWidth / 2, // Subtract sidebar width from x position
      y: e.clientY - 65,
      show: true,
      company: companyName
    })
  }

  // Add mouse leave handler
  const handleMouseLeave = () => {
    setHoverPosition({
      x: 0,
      y: 0,
      show: false,
      company: null
    })
  }

  return (
    <div className="">
      {/* Global styles for animations */}
      <style>
        {`
          @keyframes scaleAnimation {
            0%, 100% { transform: rotate(-4deg) scale(0.98); opacity: 0.5; }
            50% { transform: rotate(2deg) scale(1.02); opacity: 0.75; }
          }
        `}
      </style>

      {/* Hover Image - Move to root level */}
      <div 
        className="fixed pointer-events-none z-50 w-[100px] h-[100px] items-center justify-center"
        style={{ 
          position: 'absolute',
          left: `${hoverPosition.x}px`,
          top: `${hoverPosition.y}px`,
          opacity: hoverPosition.show ? 1 : 0,
          transition: 'opacity 0.5s ease-out ease-in'
        }}
      >
        {hoverPosition.company && (
          <div className="flex h-full items-center justify-center">
            <img
              key={hoverPosition.company}
              src={`/miniatures/images/product_companies/${hoverPosition.company.toLowerCase()}.webp`}
              alt={hoverPosition.company}
              className="max-w-[100px] max-h-[100px] shadow-xl"
              onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
            />
          </div>
        )}
      </div>

      <PageHeader bgColor="none">
        <PageHeaderTextGroup>
          <PageHeaderText>Product Admin</PageHeaderText>
          <PageHeaderSubText>Manage companies, product lines, and product sets</PageHeaderSubText>
        </PageHeaderTextGroup>
        <PageHeaderBigNumber
          icon={FaBuilding}
          number={state.overallTotals.companies}
          text="Total Companies"
          iconClassName="text-blue-500"
        />
        <PageHeaderBigNumber
          icon={FaList}
          number={state.overallTotals.lines}
          text="Total Product Lines"
          iconClassName="text-green-500"
        />
        <PageHeaderBigNumber
          icon={FaListAlt}
          number={state.overallTotals.sets}
          text="Total Product Sets"
          iconClassName="text-purple-500"
        />
      </PageHeader>

      <div className="grid grid-cols-12 gap-8">
        {/* Companies Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Companies"
            headerSubText={`There is a total of ${state.totals.companies} companies`}
            icon={FaBuilding}
            iconColor="text-blue-500"
            items={state.companies}
            selectedItem={state.selected.company}
            onSelect={(item) => setState(prev => ({
              ...prev,
              selected: { ...prev.selected, company: item, line: null }
            }))}
            onAdd={() => setState(prev => ({
              ...prev,
              modal: { type: 'addCompany', isOpen: true }
            }))}
            onEdit={(item) => setState(prev => ({
              ...prev,
              modal: { type: 'editCompany', isOpen: true, data: item }
            }))}
            onDelete={(item) => handleDelete('company', item)}
            loading={isLoading}
            searchProps={{
              value: companySearch.searchTerm,
              onChange: companySearch.setSearchTerm,
              placeholder: "Search companies..."
            }}
            pagination={{
              currentPage: companyPagination.currentPage,
              totalItems: state.totals.companies,
              itemsPerPage: companyPagination.itemsPerPage,
              onPageChange: companyPagination.setCurrentPage
            }}
            getItemName={(item) => item.name}
            onItemMouseMove={(e, item) => handleMouseMove(e, item.name)}
            onItemMouseLeave={handleMouseLeave}
          />
        </div>

        {/* Product Lines Section */}
        <div className="col-span-4">
          {state.selected.company && (
            <div className="" style={{ float: 'right', marginTop: '-75px', marginRight: '225px' }}>
              <img
                key={state.selected.company.name}
                src={`/miniatures/images/product_companies/${state.selected.company.name.toLowerCase()}.webp`}
                alt={state.selected.company.name}
                className="w-48 h-48 object-contain"
                style={{ 
                  position: 'absolute',
                  animation: 'scaleAnimation 4s ease-in-out infinite'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.visibility = 'hidden'
                }}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.visibility = 'visible'
                }}
              />
            </div>
          )}
          <UI.AdminTableSection
            title="Product Lines"
            icon={FaList}
            iconColor="text-green-500"
            items={state.productLines}
            selectedItem={state.selected.line}
            onSelect={(item) => setState(prev => ({
              ...prev,
              selected: { ...prev.selected, line: item }
            }))}
            onAdd={state.selected.company ? () => setState(prev => ({
              ...prev,
              modal: { type: 'addLine', isOpen: true }
            })) : undefined}
            onEdit={(item) => setState(prev => ({
              ...prev,
              modal: { type: 'editLine', isOpen: true, data: item }
            }))}
            onDelete={(item) => handleDelete('line', item)}
            loading={isLoading}
            addButtonDisabled={!state.selected.company}
            headerSubText={`Selected company: ${state.selected.company?.name || 'None'}`}
            searchProps={{
              value: lineSearch.searchTerm,
              onChange: lineSearch.setSearchTerm,
              placeholder: "Search product lines..."
            }}
            pagination={{
              currentPage: linePagination.currentPage,
              totalItems: state.totals.lines,
              itemsPerPage: linePagination.itemsPerPage,
              onPageChange: linePagination.setCurrentPage
            }}
            getItemName={(item) => item.name}
          />
        </div>

        {/* Product Sets Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Product Sets"
            icon={FaListAlt}
            iconColor="text-purple-500"
            items={state.productSets}
            selectedItem={state.selected.set}
            onEdit={(item) => setState(prev => ({
              ...prev,
              modal: { type: 'editSet', isOpen: true, data: item }
            }))}
            onDelete={(item) => handleDelete('set', item)}
            loading={isLoading}
            headerSubText={`Selected line: ${state.selected.line?.name || 'None'}`}
            searchProps={{
              value: setSearch.searchTerm,
              onChange: setSearch.setSearchTerm,
              placeholder: "Search product sets..."
            }}
            pagination={{
              currentPage: setPagination.currentPage,
              totalItems: state.totals.sets,
              itemsPerPage: setPagination.itemsPerPage,
              onPageChange: setPagination.setCurrentPage
            }}
            getItemName={(item) => item.name}
            onAdd={state.selected.line ? () => setState(prev => ({
              ...prev,
              modal: { type: 'addSet', isOpen: true }
            })) : undefined}
            addButtonDisabled={!state.selected.line}
            headerButtons={state.selected.line && (
              <UI.Button
                variant="btnSuccess"
                onClick={() => setState(prev => ({
                  ...prev,
                  modal: { type: 'importSets', isOpen: true }
                }))}
                disabled={!state.selected.line || isLoading}
                className="flex items-center gap-2 mr-2"
              >
                <FaFileImport /> Import List
              </UI.Button>
            )}
          />
        </div>
      </div>

      {/* Modals */}
      <ProductCompanyModal
        isOpen={['addCompany', 'editCompany'].includes(state.modal.type || '') && state.modal.isOpen}
        onClose={() => setState(prev => ({
          ...prev,
          modal: { type: null, isOpen: false }
        }))}
        onSubmit={(data) => handleModalAction(state.modal.type || '', data)}
        company={state.modal.type === 'editCompany' ? state.modal.data : null}
        isLoading={isLoading}
      />

      <ProductLineModal
        isOpen={['addLine', 'editLine'].includes(state.modal.type || '') && state.modal.isOpen}
        onClose={() => setState(prev => ({
          ...prev,
          modal: { type: null, isOpen: false }
        }))}
        onSubmit={(data) => handleModalAction(state.modal.type || '', data)}
        productLine={state.modal.type === 'editLine' ? state.modal.data : null}
        isLoading={isLoading}
      />

      <ProductSetModal
        isOpen={['addSet', 'editSet'].includes(state.modal.type || '') && state.modal.isOpen}
        onClose={() => setState(prev => ({
          ...prev,
          modal: { type: null, isOpen: false }
        }))}
        onSubmit={(data) => handleModalAction(state.modal.type || '', data)}
        productSet={state.modal.type === 'editSet' ? state.modal.data : null}
        isLoading={isLoading}
      />

      <DeleteConfirmModal
        isOpen={['deleteCompany', 'deleteLine', 'deleteSet'].includes(state.modal.type || '') && state.modal.isOpen}
        onClose={() => setState(prev => ({
          ...prev,
          modal: { type: null, isOpen: false }
        }))}
        onConfirm={async () => {
          if (state.modal.type) {
            await handleModalAction(state.modal.type)
          }
        }}
        title="Confirm Delete"
        message={`Are you sure you want to delete this ${state.modal.type?.replace('delete', '').toLowerCase()}?`}
        icon={FaTrashAlt}
      />

      <ImportProductSetsModal
        isOpen={state.modal.type === 'importSets' && state.modal.isOpen}
        onClose={() => setState(prev => ({
          ...prev,
          modal: { type: null, isOpen: false }
        }))}
        productLineId={state.selected.line?.id || 0}
        onSuccess={async () => {
          await refresh('sets')
          await loadOverallTotals()
          showSuccess('Product sets imported successfully')
        }}
      />
    </div>
  )
}