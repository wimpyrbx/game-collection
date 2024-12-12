import { useState, useEffect } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import * as UI from '../components/ui'
import { AddProductCompanyModal, EditProductCompanyModal, DeleteProductCompanyModal } from '../components/product-companies'
import { AddProductLineModal, EditProductLineModal, DeleteProductLineModal } from '../components/product-lines'
import { AddProductSetModal, EditProductSetModal, DeleteProductSetModal } from '../components/product-sets'
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
      const { data, count } = await loadCompanies(
        (page - 1) * ITEMS_PER_PAGE,
        ITEMS_PER_PAGE,
        searchTerm
      )
      setCompanies(data || [])
      setTotalCompanies(count || 0)
    } catch (error) {
      console.error('Error loading companies:', error)
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
    if (!error) {
      setShowAddCompany(false)
      refreshCompanies(companyPage, searchCompany)
    }
    setLoadingCompanies(false)
  }

  const handleEditCompany = async (id: number, name: string) => {
    setLoadingCompanies(true)
    const { error } = await editCompany(id, name)
    if (!error) {
      setShowEditCompany(false)
      refreshCompanies(companyPage, searchCompany)
    }
    setLoadingCompanies(false)
  }

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!companyToDelete) return
    setLoadingCompanies(true)
    const { error } = await deleteCompany(companyToDelete.id)
    if (!error) {
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
    if (!error) {
      setShowAddLine(false)
      refreshProductLines(selectedCompany.id)
    }
    setLoadingProductLines(false)
  }

  const handleEditProductLine = async (id: number, name: string) => {
    if (!selectedCompany) return
    setLoadingProductLines(true)
    const { error } = await editProductLine(id, name)
    if (!error) {
      setShowEditLine(false)
      refreshProductLines(selectedCompany.id)
    }
    setLoadingProductLines(false)
  }

  const handleDeleteProductLine = async (line: ProductLine) => {
    setSelectedLine(line)
    setShowDeleteLine(true)
  }

  const confirmDeleteLine = async () => {
    if (!selectedLine || !selectedCompany) return
    setLoadingProductLines(true)
    const { error } = await deleteProductLine(selectedLine.id)
    if (!error) {
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
    if (!error) {
      setShowAddSet(false)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
  }

  const handleEditProductSet = async (id: number, name: string) => {
    if (!selectedLine) return
    setLoadingProductSets(true)
    const { error } = await editProductSet(id, name)
    if (!error) {
      setShowEditSet(false)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
  }

  const handleDeleteProductSet = async (set: ProductSet) => {
    setSelectedSet(set)
    setShowDeleteSet(true)
  }

  const confirmDeleteSet = async () => {
    if (!selectedSet || !selectedLine) return
    setLoadingProductSets(true)
    const { error } = await deleteProductSet(selectedSet.id)
    if (!error) {
      setShowDeleteSet(false)
      setSelectedSet(null)
      refreshProductSets(selectedLine.id)
    }
    setLoadingProductSets(false)
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
      <div className="flex gap-6">
        {/* Companies Column */}
        <div className="flex-1 flex flex-col gap-4">
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
                  onChange={handleSearch}
                  placeholder="Filter companies..."
                  className="w-full"
                />
              </div>

              <UI.TableHeader title="Company Name" />
              <div className="space-y-1">
                {companies.length > 0 ? (
                  companies.map(company => (
                    <UI.TableRow
                      key={company.id}
                      title={company.name}
                      isSelected={selectedCompany?.id === company.id}
                      onSelect={() => setSelectedCompany(company)}
                      onEdit={() => {
                        setSelectedCompany(company)
                        setShowEditCompany(true)
                      }}
                      onDelete={() => handleDeleteCompany(company)}
                      disabled={loadingCompanies}
                    />
                  ))
                ) : loadingCompanies ? (
                  <UI.LoadingSpinner />
                ) : (
                  <div className="text-gray-500 text-center py-4">No companies found</div>
                )}
              </div>
            </UI.CardBody>
          </UI.Card>

          <UI.Pagination
            currentPage={companyPage}
            totalItems={totalCompanies}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handleCompanyPageChange}
          />
        </div>

        {/* Product Lines Column */}
        <UI.Card className="flex-1">
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
            <div className="space-y-1 min-h-[400px]">
              {productLines.map(line => (
                <UI.TableRow
                  key={line.id}
                  title={line.name}
                  isSelected={selectedLine?.id === line.id}
                  onSelect={() => setSelectedLine(line)}
                  onEdit={() => {
                    setSelectedLine(line)
                    setShowEditLine(true)
                  }}
                  onDelete={() => handleDeleteProductLine(line)}
                />
              ))}
            </div>

            {selectedCompany && (
              <UI.Pagination
                currentPage={productLinePage}
                totalItems={productLines.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setProductLinePage}
              />
            )}
          </UI.CardBody>
        </UI.Card>

        {/* Product Sets Column */}
        <UI.Card className="flex-1">
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
            <div className="space-y-1 min-h-[400px]">
              {productSets.map(set => (
                <UI.TableRow
                  key={set.id}
                  title={set.name}
                  isSelected={selectedSet?.id === set.id}
                  onSelect={() => setSelectedSet(set)}
                  onEdit={() => {
                    setSelectedSet(set)
                    setShowEditSet(true)
                  }}
                  onDelete={() => handleDeleteProductSet(set)}
                />
              ))}
            </div>

            {selectedLine && (
              <UI.Pagination
                currentPage={productSetPage}
                totalItems={productSets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setProductSetPage}
              />
            )}
          </UI.CardBody>
        </UI.Card>
      </div>

      {/* Company Modals */}
      <AddProductCompanyModal
        isOpen={showAddCompany}
        onClose={() => setShowAddCompany(false)}
        onAdd={handleAddCompany}
        isLoading={loadingCompanies}
      />

      <EditProductCompanyModal
        isOpen={showEditCompany}
        onClose={() => setShowEditCompany(false)}
        onEdit={handleEditCompany}
        company={selectedCompany}
        isLoading={loadingCompanies}
      />

      <DeleteProductCompanyModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setCompanyToDelete(null)
        }}
        onConfirm={confirmDelete}
        company={companyToDelete}
        isLoading={loadingCompanies}
      />

      {/* Product Line Modals */}
      <AddProductLineModal
        isOpen={showAddLine}
        onClose={() => setShowAddLine(false)}
        onAdd={handleAddProductLine}
        isLoading={loadingProductLines}
      />

      <EditProductLineModal
        isOpen={showEditLine}
        onClose={() => setShowEditLine(false)}
        onEdit={handleEditProductLine}
        productLine={selectedLine}
        isLoading={loadingProductLines}
      />

      <DeleteProductLineModal
        isOpen={showDeleteLine}
        onClose={() => setShowDeleteLine(false)}
        onConfirm={confirmDeleteLine}
        productLine={selectedLine}
        isLoading={loadingProductLines}
      />

      {/* Product Set Modals */}
      <AddProductSetModal
        isOpen={showAddSet}
        onClose={() => setShowAddSet(false)}
        onAdd={handleAddProductSet}
        isLoading={loadingProductSets}
      />

      <EditProductSetModal
        isOpen={showEditSet}
        onClose={() => setShowEditSet(false)}
        onEdit={handleEditProductSet}
        productSet={selectedSet}
        isLoading={loadingProductSets}
      />

      <DeleteProductSetModal
        isOpen={showDeleteSet}
        onClose={() => setShowDeleteSet(false)}
        onConfirm={confirmDeleteSet}
        productSet={selectedSet}
        isLoading={loadingProductSets}
      />
    </>
  )
}