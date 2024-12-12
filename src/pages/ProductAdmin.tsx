import { useState, useEffect } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import { useNotification } from '../hooks/useNotification'
import * as UI from '../components/ui'
import { ProductLineModal, ProductSetModal, ProductCompanyModal } from '../components/productadmin'
import { FaBuilding, FaList, FaListAlt, FaTrash } from 'react-icons/fa'

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

  const { notification, showSuccess, showError } = useNotification()

  // Data state
  const [companies, setCompanies] = useState<Company[]>([])
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [productSets, setProductSets] = useState<ProductSet[]>([])

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

  // Search state
  const [searchCompany, setSearchCompany] = useState('')

  // Pagination state
  const [companyPage, setCompanyPage] = useState(1)
  const [productLinePage, setProductLinePage] = useState(1)
  const [productSetPage, setProductSetPage] = useState(1)
  const [totalCompanies, setTotalCompanies] = useState(0)
  const [totalProductLines, setTotalProductLines] = useState(0)
  const [totalProductSets, setTotalProductSets] = useState(0)

  // Loading state
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingProductLines, setLoadingProductLines] = useState(false)
  const [loadingProductSets, setLoadingProductSets] = useState(false)

  const ITEMS_PER_PAGE = 10

  // Companies handlers
  const refreshCompanies = async (page = 1, searchTerm = '') => {
    setLoadingCompanies(true)
    try {
      const { data, count, error } = await loadCompanies(
        (page - 1) * ITEMS_PER_PAGE,
        ITEMS_PER_PAGE,
        searchTerm
      )
      if (error) {
        showError('Failed to load companies')
        return
      }
      setCompanies(data || [])
      setTotalCompanies(count || 0)
    } catch (error) {
      showError('An unexpected error occurred while loading companies')
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchCompany(term)
    setCompanyPage(1)
    refreshCompanies(1, term)
  }

  const handleCompanyPageChange = (page: number) => {
    setCompanyPage(page)
    refreshCompanies(page, searchCompany)
  }

  const handleAddCompany = async (name: string) => {
    setLoadingCompanies(true)
    const { error } = await addCompany(name)
    if (error) {
      showError(`Failed to add company: ${error}`)
    } else {
      showSuccess('Company added successfully')
      setShowAddCompany(false)
      refreshCompanies(companyPage, searchCompany)
    }
    setLoadingCompanies(false)
  }

  const handleEditCompany = async (id: number, name: string) => {
    setLoadingCompanies(true)
    const { error } = await editCompany(id, name)
    if (error) {
      showError(`Failed to edit company: ${error}`)
    } else {
      showSuccess('Company updated successfully')
      setShowEditCompany(false)
      refreshCompanies(companyPage, searchCompany)
    }
    setLoadingCompanies(false)
  }

  const handleDeleteCompany = async (company: Company) => {
    // First check if company can be deleted (has no product lines)
    const productLines = await loadProductLines(company.id)
    if (productLines && productLines.length > 0) {
      showError('Cannot delete company that has product lines')
      return
    }
    
    setCompanyToDelete(company)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!companyToDelete) return
    setLoadingCompanies(true)
    const { error } = await deleteCompany(companyToDelete.id)
    if (error) {
      showError(`Failed to delete company: ${error}`)
    } else {
      showSuccess('Company deleted successfully')
      if (selectedCompany?.id === companyToDelete.id) {
        setSelectedCompany(null)
      }
      setShowDeleteConfirm(false)
      setCompanyToDelete(null)
      refreshCompanies(companyPage, searchCompany)
    }
    setLoadingCompanies(false)
  }

  // Product Lines handlers
  const refreshProductLines = async (companyId: number) => {
    setLoadingProductLines(true)
    try {
      const data = await loadProductLines(companyId)
      setProductLines(data || [])
      setTotalProductLines(data?.length || 0)
    } catch (error) {
      console.error('Error refreshing product lines:', error)
    } finally {
      setLoadingProductLines(false)
    }
  }

  const handleAddProductLine = async (name: string) => {
    if (!selectedCompany) return
    setLoadingProductLines(true)
    const { error } = await addProductLine(name, selectedCompany.id)
    if (error) {
      showError(`Failed to add product line: ${error}`)
    } else {
      showSuccess('Product line added successfully')
      setShowAddLine(false)
      refreshProductLines(selectedCompany.id)
    }
    setLoadingProductLines(false)
  }

  const handleEditProductLine = async (id: number, name: string) => {
    if (!selectedCompany) return
    setLoadingProductLines(true)
    const { error } = await editProductLine(id, name)
    if (error) {
      showError(`Failed to edit product line: ${error}`)
    } else {
      showSuccess('Product line updated successfully')
      setShowEditLine(false)
      refreshProductLines(selectedCompany.id)
    }
    setLoadingProductLines(false)
  }

  const handleDeleteProductLine = async (line: ProductLine) => {
    // First check if product line can be deleted (has no product sets)
    const productSets = await loadProductSets(line.id)
    if (productSets && productSets.length > 0) {
      showError('Cannot delete product line that has product sets')
      return
    }

    setSelectedLine(line)
    setShowDeleteLine(true)
  }

  const confirmDeleteLine = async () => {
    if (!selectedLine || !selectedCompany) return
    setLoadingProductLines(true)
    const { error } = await deleteProductLine(selectedLine.id)
    if (error) {
      showError(`Failed to delete product line: ${error}`)
    } else {
      showSuccess('Product line deleted successfully')
      setShowDeleteLine(false)
      setSelectedLine(null)
      refreshProductLines(selectedCompany.id)
    }
    setLoadingProductLines(false)
  }

  // Product Sets handlers
  const refreshProductSets = async (lineId: number) => {
    const data = await loadProductSets(lineId)
    setProductSets(data)
  }

  const handleAddProductSet = async (name: string) => {
    if (!selectedLine) return
    setLoadingProductSets(true)
    const { error } = await addProductSet(name, selectedLine.id)
    if (error) {
      showError(`Failed to add product set: ${error}`)
    } else {
      showSuccess('Product set added successfully')
      setShowAddSet(false)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
  }

  const handleEditProductSet = async (id: number, name: string) => {
    if (!selectedLine) return
    setLoadingProductSets(true)
    const { error } = await editProductSet(id, name)
    if (error) {
      showError(`Failed to edit product set: ${error}`)
    } else {
      showSuccess('Product set updated successfully')
      setShowEditSet(false)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
  }

  const handleDeleteProductSet = async (set: ProductSet) => {
    // Add any deletion rules check here if needed
    setSelectedSet(set)
    setShowDeleteSet(true)
  }

  const confirmDeleteSet = async () => {
    if (!selectedSet || !selectedLine) return
    setLoadingProductSets(true)
    const { error } = await deleteProductSet(selectedSet.id)
    if (error) {
      showError(`Failed to delete product set: ${error}`)
    } else {
      showSuccess('Product set deleted successfully')
      setShowDeleteSet(false)
      setSelectedSet(null)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
  }

  // Company handlers
  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    setSelectedLine(null)
    setSelectedSet(null)
    if (company) {
      refreshProductLines(company.id)
    }
  }

  const handleCompanyEdit = (company: Company) => {
    setSelectedCompany(company)
    setShowEditCompany(true)
  }

  // Product Line handlers
  const handleLineSelect = (line: ProductLine) => {
    setSelectedLine(line)
    setSelectedSet(null)
    if (line) {
      refreshProductSets(line.id)
    }
  }

  const handleLineEdit = (line: ProductLine) => {
    setSelectedLine(line)
    setShowEditLine(true)
  }

  // Product Set handlers
  const handleSetEdit = (set: ProductSet) => {
    setSelectedSet(set)
    setShowEditSet(true)
  }

  // Effects
  useEffect(() => {
    refreshCompanies(companyPage, searchCompany)
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      refreshProductLines(selectedCompany.id)
    } else {
      setProductLines([])
      setSelectedLine(null)
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedLine) {
      refreshProductSets(selectedLine.id)
    } else {
      setProductSets([])
      setSelectedSet(null)
    }
  }, [selectedLine])

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {/* Companies Section */}
        <div className="flex flex-col gap-2">
          <UI.Card>
            <UI.CardHeader>
              <div className="flex">
                <UI.CardIcon size="big" className="text-blue-700">
                  <FaBuilding />
                </UI.CardIcon>
                <div>
                  <UI.CardHeaderText>
                    Companies
                  </UI.CardHeaderText>
                  <UI.CardHeaderSubText>
                    Manage your product companies
                  </UI.CardHeaderSubText>
                </div>
              </div>
              <UI.CardHeaderRightSide>
                <UI.Button 
                  variant="btnSuccess"
                  onClick={() => setShowAddCompany(true)}
                >
                  + Add Company
                </UI.Button>
              </UI.CardHeaderRightSide>
            </UI.CardHeader>
            <UI.CardBody>
              <div className="mb-4">
                <UI.SearchInput
                  value={searchCompany}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="w-full"
                />
              </div>
              <UI.TableHeader title="Company Name" />
              {companies.length === 0 && !loadingCompanies ? (
                <UI.EmptyTableState icon={<FaBuilding />} message="No companies found" />
              ) : (
                companies.map((company) => (
                  <UI.TableRow
                    key={company.id}
                    title={company.name}
                    isSelected={selectedCompany?.id === company.id}
                    onSelect={() => handleCompanySelect(company)}
                    onEdit={() => handleCompanyEdit(company)}
                    onDelete={() => handleDeleteCompany(company)}
                  />
                ))
              )}
            </UI.CardBody>
          </UI.Card>
          {companies.length > 0 && (
            <UI.Pagination
              currentPage={companyPage}
              totalItems={totalCompanies}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handleCompanyPageChange}
            />
          )}
        </div>

        {/* Product Lines Section */}
        <div className="flex flex-col gap-2">
          <UI.Card>
            <UI.CardHeader>
              <div className="flex">
                <UI.CardIcon size="big" className="text-green-700">
                  <FaList />
                </UI.CardIcon>
                <div>
                  <UI.CardHeaderText>
                    Product Lines
                  </UI.CardHeaderText>
                  <UI.CardHeaderSubText>
                    Selected company: <strong>{selectedCompany?.name || 'None'}</strong>
                  </UI.CardHeaderSubText>
                  <UI.CardHeaderItalicText>
                    {!selectedCompany 
                      ? '* Please select a company to manage its product lines'
                      : productLines.length === 0
                        ? '* No product lines yet'
                        : `This company has ${productLines.length} product line(s)`}
                  </UI.CardHeaderItalicText>
                </div>
              </div>
              <UI.CardHeaderRightSide>
                <UI.Button 
                  variant="btnSuccess"
                  onClick={() => setShowAddLine(true)}
                  disabled={!selectedCompany}
                >
                  + Add Product Line
                </UI.Button>
              </UI.CardHeaderRightSide>
            </UI.CardHeader>
            <UI.CardBody>
              <UI.TableHeader title="Product Line Name" />
              {!selectedCompany ? (
                <UI.EmptyTableState icon={<FaList />} message="Select a company to view product lines" />
              ) : productLines.length === 0 && !loadingProductLines ? (
                <UI.EmptyTableState icon={<FaList />} message="No product lines found" />
              ) : (
                productLines.map((line) => (
                  <UI.TableRow
                    key={line.id}
                    title={line.name}
                    isSelected={selectedLine?.id === line.id}
                    onSelect={() => handleLineSelect(line)}
                    onEdit={() => handleLineEdit(line)}
                    onDelete={() => handleDeleteProductLine(line)}
                  />
                ))
              )}
            </UI.CardBody>
          </UI.Card>
          {selectedCompany && productLines.length > 0 && (
            <UI.Pagination
              currentPage={productLinePage}
              totalItems={productLines.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setProductLinePage}
            />
          )}
        </div>

        {/* Product Sets Section */}
        <div className="flex flex-col gap-2">
          <UI.Card>
            <UI.CardHeader>
              <div className="flex">
                <UI.CardIcon size="big" className="text-purple-700">
                  <FaListAlt />
                </UI.CardIcon>
                <div>
                  <UI.CardHeaderText>
                    Product Sets
                  </UI.CardHeaderText>
                  <UI.CardHeaderSubText>
                    Selected line: <strong>{selectedLine?.name || 'None'}</strong>
                  </UI.CardHeaderSubText>
                  <UI.CardHeaderItalicText>
                    {!selectedLine 
                      ? '* Please select a product line to manage its sets'
                      : productSets.length === 0
                        ? '* No product sets yet'
                        : `This line has ${productSets.length} product set(s)`}
                  </UI.CardHeaderItalicText>
                </div>
              </div>
              <UI.CardHeaderRightSide>
                <UI.Button 
                  variant="btnSuccess"
                  onClick={() => setShowAddSet(true)}
                  disabled={!selectedLine}
                >
                  + Add Product Set
                </UI.Button>
              </UI.CardHeaderRightSide>
            </UI.CardHeader>
            <UI.CardBody>
              <UI.TableHeader title="Product Set Name" />
              {!selectedLine ? (
                <UI.EmptyTableState icon={<FaListAlt />} message="Select a product line to view sets" />
              ) : productSets.length === 0 && !loadingProductSets ? (
                <UI.EmptyTableState icon={<FaListAlt />} message="No product sets found" />
              ) : (
                productSets.map((set) => (
                  <UI.TableRow
                    key={set.id}
                    title={set.name}
                    isSelected={selectedSet?.id === set.id}
                    onEdit={() => handleSetEdit(set)}
                    onDelete={() => handleDeleteProductSet(set)}
                  />
                ))
              )}
            </UI.CardBody>
          </UI.Card>
          {selectedLine && productSets.length > 0 && (
            <UI.Pagination
              currentPage={productSetPage}
              totalItems={productSets.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setProductSetPage}
            />
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {notification.isVisible && (
        <UI.Toast
          message={notification.message}
          type={notification.type}
        />
      )}

      {/* Modals */}
      <ProductCompanyModal
        isOpen={showAddCompany || showEditCompany}
        onClose={() => {
          setShowAddCompany(false)
          setShowEditCompany(false)
          setSelectedCompany(null)
        }}
        onSubmit={async (name) => {
          if (showEditCompany && selectedCompany) {
            await handleEditCompany(selectedCompany.id, name)
          } else {
            await handleAddCompany(name)
          }
        }}
        company={showEditCompany ? selectedCompany : null}
        isLoading={loadingCompanies}
      />

      <UI.DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setCompanyToDelete(null)
        }}
        onConfirm={confirmDelete}
        isLoading={loadingCompanies}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        itemName={companyToDelete?.name || ''}
        icon={FaTrash}
      />

      <ProductLineModal
        isOpen={showAddLine || showEditLine}
        onClose={() => {
          setShowAddLine(false)
          setShowEditLine(false)
          setSelectedLine(null)
        }}
        onSubmit={async (name) => {
          if (showEditLine && selectedLine) {
            await handleEditProductLine(selectedLine.id, name)
          } else {
            await handleAddProductLine(name)
          }
        }}
        productLine={showEditLine ? selectedLine : null}
        isLoading={loadingProductLines}
      />

      <UI.DeleteConfirmModal
        isOpen={showDeleteLine}
        onClose={() => {
          setShowDeleteLine(false)
          setSelectedLine(null)
        }}
        onConfirm={confirmDeleteLine}
        isLoading={loadingProductLines}
        title="Delete Product Line"
        message="Are you sure you want to delete this product line? This action cannot be undone."
        itemName={selectedLine?.name || ''}
        icon={FaTrash}
      />

      <ProductSetModal
        isOpen={showAddSet || showEditSet}
        onClose={() => {
          setShowAddSet(false)
          setShowEditSet(false)
          setSelectedSet(null)
        }}
        onSubmit={async (name) => {
          if (showEditSet && selectedSet) {
            await handleEditProductSet(selectedSet.id, name)
          } else {
            await handleAddProductSet(name)
          }
        }}
        productSet={showEditSet ? selectedSet : null}
        isLoading={loadingProductSets}
      />

      <UI.DeleteConfirmModal
        isOpen={showDeleteSet}
        onClose={() => {
          setShowDeleteSet(false)
          setSelectedSet(null)
        }}
        onConfirm={confirmDeleteSet}
        isLoading={loadingProductSets}
        title="Delete Product Set"
        message="Are you sure you want to delete this product set? This action cannot be undone."
        itemName={selectedSet?.name || ''}
        icon={FaTrash}
      />
    </>
  )
}