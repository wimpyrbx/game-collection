import { useState, useEffect } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import { useNotification } from '../hooks/useNotification'
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
  // Admin hooks
  const companyPagination = useAdminPagination({ itemsPerPage: 10 })
  const companySearch = useAdminSearch({ searchFields: ['name'] })
  const linePagination = useAdminPagination({ itemsPerPage: 10 })
  const lineSearch = useAdminSearch({ searchFields: ['name'] })
  const setPagination = useAdminPagination({ itemsPerPage: 10 })
  const setSearch = useAdminSearch({ searchFields: ['name'] })
  const loading = useAdminLoading()

  const {
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
    deleteCompany,
    deleteProductLine,
    deleteProductSet
  } = useProductAdmin()

  const { showSuccess, showError, notification } = useNotification()

  // Data state
  const [companies, setCompanies] = useState<Company[]>([])
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [productSets, setProductSets] = useState<ProductSet[]>([])
  const [totalCompanies, setTotalCompanies] = useState(0)

  // Selection state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null)
  const [selectedSet, setSelectedSet] = useState<ProductSet | null>(null)

  // Modal states
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [showAddLine, setShowAddLine] = useState(false)
  const [showAddSet, setShowAddSet] = useState(false)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [showEditLine, setShowEditLine] = useState(false)
  const [showEditSet, setShowEditSet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteLine, setShowDeleteLine] = useState(false)
  const [showDeleteSet, setShowDeleteSet] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)

  // Load initial data and handle search/pagination
  useEffect(() => {
    refreshCompanies(companyPagination.currentPage, companySearch.searchTerm)
  }, [companyPagination.currentPage, companySearch.searchTerm])

  useEffect(() => {
    if (selectedCompany) {
      refreshProductLines(selectedCompany.id, linePagination.currentPage, lineSearch.searchTerm)
    } else {
      setProductLines([])
      setSelectedLine(null)
    }
  }, [selectedCompany, linePagination.currentPage, lineSearch.searchTerm])

  useEffect(() => {
    if (selectedLine) {
      refreshProductSets(selectedLine.id, setPagination.currentPage, setSearch.searchTerm)
    } else {
      setProductSets([])
      setSelectedSet(null)
    }
  }, [selectedLine, setPagination.currentPage, setSearch.searchTerm])

  // Companies handlers
  const refreshCompanies = async (page = 1, searchTerm = '') => {
    const { data, count, error } = await loading.withLoading(
      loadCompanies(
        (page - 1) * companyPagination.itemsPerPage,
        companyPagination.itemsPerPage,
        searchTerm
      )
    )

    if (error) {
      showError('Failed to load companies')
      return
    }

    if (data) {
      setCompanies(data)
      setTotalCompanies(count || 0)
    }
  }

  // Product Lines handlers
  const refreshProductLines = async (companyId: number, page = 1, searchTerm = '') => {
    const { data, count, error } = await loading.withLoading(
      loadProductLines(
        companyId,
        (page - 1) * linePagination.itemsPerPage,
        linePagination.itemsPerPage,
        searchTerm
      )
    )
    if (error) {
      showError('Failed to load product lines')
      return
    }
    if (data) {
      setProductLines(data)
    }
  }

  // Product Sets handlers
  const refreshProductSets = async (lineId: number, page = 1, searchTerm = '') => {
    const { data, count, error } = await loading.withLoading(
      loadProductSets(
        lineId,
        (page - 1) * setPagination.itemsPerPage,
        setPagination.itemsPerPage,
        searchTerm
      )
    )
    if (error) {
      showError('Failed to load product sets')
      return
    }
    if (data) {
      setProductSets(data)
    }
  }

  // Company handlers
  const handleAddCompany = async (name: string) => {
    const { error } = await loading.withLoading(addCompany(name))
    if (error) {
      showError(`Failed to add company: ${error}`)
      return
    }
    
    showSuccess('Company added successfully')
    setShowAddCompany(false)
    refreshCompanies(companyPagination.currentPage, companySearch.searchTerm)
  }

  const handleEditCompany = async (id: number, name: string) => {
    const { error } = await loading.withLoading(editCompany(id, name))
    if (error) {
      showError(`Failed to edit company: ${error}`)
      return
    }
    
    showSuccess('Company updated successfully')
    setShowEditCompany(false)
    refreshCompanies(companyPagination.currentPage, companySearch.searchTerm)
  }

  const handleDeleteCompany = async (company: Company) => {
    const { data: productLines } = await loading.withLoading(loadProductLines(company.id, 0, 1000))
    if (productLines && productLines.length > 0) {
      showError('Cannot delete company that has product lines')
      return
    }
    
    setCompanyToDelete(company)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!companyToDelete) return

    const { error } = await loading.withLoading(deleteCompany(companyToDelete.id))
    if (error) {
      showError(`Failed to delete company: ${error}`)
      return
    }
    
    showSuccess('Company deleted successfully')
    if (selectedCompany?.id === companyToDelete.id) {
      setSelectedCompany(null)
    }
    setShowDeleteConfirm(false)
    setCompanyToDelete(null)
    refreshCompanies(companyPagination.currentPage, companySearch.searchTerm)
  }

  // Product Line handlers
  const handleAddProductLine = async (name: string) => {
    if (!selectedCompany) return

    const { error } = await loading.withLoading(addProductLine(name, selectedCompany.id))
    if (error) {
      showError(`Failed to add product line: ${error}`)
      return
    }
    
    showSuccess('Product line added successfully')
    setShowAddLine(false)
    refreshProductLines(selectedCompany.id)
  }

  const handleEditProductLine = async (id: number, name: string) => {
    if (!selectedCompany) return

    const { error } = await loading.withLoading(editProductLine(id, name))
    if (error) {
      showError(`Failed to edit product line: ${error}`)
      return
    }
    
    showSuccess('Product line updated successfully')
    setShowEditLine(false)
    refreshProductLines(selectedCompany.id)
  }

  const handleDeleteProductLine = async (line: ProductLine) => {
    const { data: productSets } = await loading.withLoading(loadProductSets(line.id, 0, 1000))
    if (productSets && productSets.length > 0) {
      showError('Cannot delete product line that has product sets')
      return
    }

    setSelectedLine(line)
    setShowDeleteLine(true)
  }

  const confirmDeleteLine = async () => {
    if (!selectedLine || !selectedCompany) return

    const { error } = await loading.withLoading(deleteProductLine(selectedLine.id))
    if (error) {
      showError(`Failed to delete product line: ${error}`)
      return
    }
    
    showSuccess('Product line deleted successfully')
    setShowDeleteLine(false)
    setSelectedLine(null)
    refreshProductLines(selectedCompany.id)
  }

  // Product Set handlers
  const handleAddProductSet = async (name: string) => {
    if (!selectedLine) return

    const { error } = await loading.withLoading(addProductSet(name, selectedLine.id))
    if (error) {
      showError(`Failed to add product set: ${error}`)
      return
    }
    
    showSuccess('Product set added successfully')
    setShowAddSet(false)
    refreshProductSets(selectedLine.id)
  }

  const handleEditProductSet = async (id: number, name: string) => {
    if (!selectedLine) return

    const { error } = await loading.withLoading(editProductSet(id, name))
    if (error) {
      showError(`Failed to edit product set: ${error}`)
      return
    }
    
    showSuccess('Product set updated successfully')
    setShowEditSet(false)
    refreshProductSets(selectedLine.id)
  }

  const handleDeleteProductSet = async (set: ProductSet) => {
    setSelectedSet(set)
    setShowDeleteSet(true)
  }

  const confirmDeleteSet = async () => {
    if (!selectedSet || !selectedLine) return

    const { error } = await loading.withLoading(deleteProductSet(selectedSet.id))
    if (error) {
      showError(`Failed to delete product set: ${error}`)
      return
    }
    
    showSuccess('Product set deleted successfully')
    setShowDeleteSet(false)
    setSelectedSet(null)
    refreshProductSets(selectedLine.id)
  }

  // Filter and paginate items
  const filteredCompanies = companySearch.filterItems(companies)
  const paginatedCompanies = companyPagination.getPageItems(filteredCompanies)
  
  const filteredLines = lineSearch.filterItems(productLines)
  const paginatedLines = linePagination.getPageItems(filteredLines)
  
  const filteredSets = setSearch.filterItems(productSets)
  const paginatedSets = setPagination.getPageItems(filteredSets)

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {/* Companies Section */}
        <UI.AdminTableSection
          title="Companies"
          icon={FaBuilding}
          items={paginatedCompanies}
          selectedItem={selectedCompany}
          onSelect={(company) => {
            setSelectedCompany(company)
            setSelectedLine(null)
            setSelectedSet(null)
            refreshProductLines(company.id, linePagination.currentPage, lineSearch.searchTerm)
          }}
          onAdd={() => setShowAddCompany(true)}
          onEdit={(company) => {
            setSelectedCompany(company)
            setShowEditCompany(true)
          }}
          onDelete={handleDeleteCompany}
          loading={loading.isLoading}
          headerSubText="Manage your product companies"
          searchProps={{
            ...companySearch.searchProps,
            placeholder: "Search companies..."
          }}
          pagination={{
            ...companyPagination.paginationProps,
            totalItems: totalCompanies
          }}
          getItemName={(item) => item.name}
        />

        {/* Product Lines Section */}
        <UI.AdminTableSection
          title="Product Lines"
          icon={FaList}
          items={paginatedLines}
          selectedItem={selectedLine}
          onSelect={(line) => {
            setSelectedLine(line)
            setSelectedSet(null)
            refreshProductSets(line.id, setPagination.currentPage, setSearch.searchTerm)
          }}
          onAdd={() => setShowAddLine(true)}
          onEdit={(line) => {
            setSelectedLine(line)
            setShowEditLine(true)
          }}
          onDelete={handleDeleteProductLine}
          loading={loading.isLoading}
          headerSubText="Manage product lines"
          headerItalicText={selectedCompany ? `for ${selectedCompany.name}` : undefined}
          addButtonDisabled={!selectedCompany}
          emptyMessage={selectedCompany ? "No product lines found" : "Select a company to view product lines"}
          searchProps={{
            ...lineSearch.searchProps,
            placeholder: "Search product lines..."
          }}
          pagination={{
            ...linePagination.paginationProps,
            totalItems: filteredLines.length
          }}
          getItemName={(item) => item.name}
        />

        {/* Product Sets Section */}
        <UI.AdminTableSection
          title="Product Sets"
          icon={FaListAlt}
          items={paginatedSets}
          selectedItem={selectedSet}
          onSelect={setSelectedSet}
          onAdd={() => setShowAddSet(true)}
          onEdit={(set) => {
            setSelectedSet(set)
            setShowEditSet(true)
          }}
          onDelete={handleDeleteProductSet}
          loading={loading.isLoading}
          headerSubText="Manage product sets"
          headerItalicText={selectedLine ? `for ${selectedLine.name}` : undefined}
          addButtonDisabled={!selectedLine}
          emptyMessage={selectedLine ? "No product sets found" : "Select a product line to view sets"}
          searchProps={{
            ...setSearch.searchProps,
            placeholder: "Search product sets..."
          }}
          pagination={{
            ...setPagination.paginationProps,
            totalItems: filteredSets.length
          }}
          getItemName={(item) => item.name}
        />
      </div>

      {/* Modals */}
      {showAddCompany && (
        <ProductCompanyModal
          isOpen={showAddCompany}
          onClose={() => setShowAddCompany(false)}
          onSubmit={handleAddCompany}
          isLoading={loading.isLoading}
        />
      )}

      {showEditCompany && selectedCompany && (
        <ProductCompanyModal
          isOpen={showEditCompany}
          onClose={() => setShowEditCompany(false)}
          onSubmit={(name) => handleEditCompany(selectedCompany.id, name)}
          company={selectedCompany}
          isLoading={loading.isLoading}
        />
      )}

      {showAddLine && (
        <ProductLineModal
          isOpen={showAddLine}
          onClose={() => setShowAddLine(false)}
          onSubmit={handleAddProductLine}
          isLoading={loading.isLoading}
        />
      )}

      {showEditLine && selectedLine && (
        <ProductLineModal
          isOpen={showEditLine}
          onClose={() => setShowEditLine(false)}
          onSubmit={(name) => handleEditProductLine(selectedLine.id, name)}
          productLine={selectedLine}
          isLoading={loading.isLoading}
        />
      )}

      {showAddSet && (
        <ProductSetModal
          isOpen={showAddSet}
          onClose={() => setShowAddSet(false)}
          onSubmit={handleAddProductSet}
          isLoading={loading.isLoading}
        />
      )}

      {showEditSet && selectedSet && (
        <ProductSetModal
          isOpen={showEditSet}
          onClose={() => setShowEditSet(false)}
          onSubmit={(name) => handleEditProductSet(selectedSet.id, name)}
          productSet={selectedSet}
          isLoading={loading.isLoading}
        />
      )}

      <UI.DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setCompanyToDelete(null)
        }}
        onConfirm={confirmDelete}
        isLoading={loading.isLoading}
        title="Delete Company"
        message="Are you sure you want to delete the company"
        itemName={companyToDelete?.name || ''}
        icon={FaBuilding}
      />

      <UI.DeleteConfirmModal
        isOpen={showDeleteLine}
        onClose={() => {
          setShowDeleteLine(false)
          setSelectedLine(null)
        }}
        onConfirm={confirmDeleteLine}
        isLoading={loading.isLoading}
        title="Delete Product Line"
        message="Are you sure you want to delete the product line"
        itemName={selectedLine?.name || ''}
        icon={FaList}
      />

      <UI.DeleteConfirmModal
        isOpen={showDeleteSet}
        onClose={() => {
          setShowDeleteSet(false)
          setSelectedSet(null)
        }}
        onConfirm={confirmDeleteSet}
        isLoading={loading.isLoading}
        title="Delete Product Set"
        message="Are you sure you want to delete the product set"
        itemName={selectedSet?.name || ''}
        icon={FaListAlt}
      />

      {error && (
        <UI.Toast
          message={error}
          type="error"
        />
      )}

      {notification.isVisible && (
        <UI.Toast
          message={notification.message}
          type={notification.type}
        />
      )}
    </>
  )
}