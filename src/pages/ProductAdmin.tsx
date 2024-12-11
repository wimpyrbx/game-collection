import { useState, useEffect } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import Modal from '../components/Modal'
import { TextArea } from '../components/TextArea'

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

  const [companies, setCompanies] = useState<Company[]>([])
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [productSets, setProductSets] = useState<ProductSet[]>([])

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null)
  const [selectedSet, setSelectedSet] = useState<ProductSet | null>(null)

  const [showAddCompany, setShowAddCompany] = useState(false)
  const [showAddLine, setShowAddLine] = useState(false)
  const [showAddSet, setShowAddSet] = useState(false)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [showEditLine, setShowEditLine] = useState(false)
  const [showEditSet, setShowEditSet] = useState(false)

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [searchCompany, setSearchCompany] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  const totalCount = companies.length // or get from API if implementing server-side pagination

  useEffect(() => {
    refreshCompanies()
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

  const refreshCompanies = async () => {
    const data = await loadCompanies()
    setCompanies(data)
  }

  const refreshProductLines = async (companyId: number) => {
    const data = await loadProductLines(companyId)
    setProductLines(data)
  }

  const refreshProductSets = async (lineId: number) => {
    const data = await loadProductSets(lineId)
    setProductSets(data)
  }

  const handleAddCompany = async () => {
    const { error } = await addCompany(newName, newDescription)
    if (!error) {
      setShowAddCompany(false)
      setNewName('')
      setNewDescription('')
      refreshCompanies()
    }
  }

  const handleAddProductLine = async () => {
    if (!selectedCompany) return
    const { error } = await addProductLine(newName, selectedCompany.id, newDescription)
    if (!error) {
      setShowAddLine(false)
      setNewName('')
      setNewDescription('')
      refreshProductLines(selectedCompany.id)
    }
  }

  const handleAddProductSet = async () => {
    if (!selectedLine) return
    const { error } = await addProductSet(newName, selectedLine.id, newDescription)
    if (!error) {
      setShowAddSet(false)
      setNewName('')
      setNewDescription('')
      refreshProductSets(selectedLine.id)
    }
  }

  const handleEditCompany = async () => {
    if (!selectedCompany) return
    const { error } = await editCompany(selectedCompany.id, newName, newDescription)
    if (!error) {
      setShowEditCompany(false)
      setNewName('')
      setNewDescription('')
      refreshCompanies()
    }
  }

  const handleEditProductLine = async () => {
    if (!selectedLine) return
    const { error } = await editProductLine(selectedLine.id, newName, newDescription)
    if (!error) {
      setShowEditLine(false)
      setNewName('')
      setNewDescription('')
      if (selectedCompany) {
        refreshProductLines(selectedCompany.id)
      }
    }
  }

  const handleEditProductSet = async () => {
    if (!selectedSet) return
    const { error } = await editProductSet(selectedSet.id, newName, newDescription)
    if (!error) {
      setShowEditSet(false)
      setNewName('')
      setNewDescription('')
      if (selectedLine) {
        refreshProductSets(selectedLine.id)
      }
    }
  }

  const handleDeleteCompany = async (company: Company) => {
    const { error } = await deleteCompany(company.id)
    if (!error) {
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(null)
      }
      refreshCompanies()
    }
  }

  const handleDeleteProductLine = async (line: ProductLine) => {
    const { error } = await deleteProductLine(line.id)
    if (!error) {
      if (selectedLine?.id === line.id) {
        setSelectedLine(null)
      }
      if (selectedCompany) {
        refreshProductLines(selectedCompany.id)
      }
    }
  }

  const handleDeleteProductSet = async (set: ProductSet) => {
    const { error } = await deleteProductSet(set.id)
    if (!error) {
      if (selectedSet?.id === set.id) {
        setSelectedSet(null)
      }
      if (selectedLine) {
        refreshProductSets(selectedLine.id)
      }
    }
  }

  const handleSearch = (value: string) => {
    setSearchCompany(value)
    setCurrentPage(1)
  }

  const getPageNumbers = () => {
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
    const pageNumbers: (number | string)[] = []
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return pageNumbers
  }

  return (
    <div className="flex gap-6">
      {/* Companies Column */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Companies</h2>
          <div className="text-sm text-gray-400">
            Select a company to manage product lines.
          </div>
          <div className="text-sm italic text-gray-500">
            * Each company can have 0 or any number of product lines
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <input
            type="text"
            placeholder="Filter companies..."
            value={searchCompany}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-gray-700 p-2 rounded w-64"
          />
          <button 
            className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
            onClick={() => setShowAddCompany(true)}
          >
            + Add Company
          </button>
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Company Name</div>
          <div className="w-20"></div>
        </div>

        {/* Table Content */}
        <div className="space-y-1">
          {companies.map(company => (
            <div 
              key={company.id}
              onClick={() => setSelectedCompany(company)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                selectedCompany?.id === company.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span>{company.name}</span>
              <div className="flex gap-1 w-20 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCompany(company)
                    setNewName(company.name)
                    setShowEditCompany(true)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCompany(company)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="flex justify-between items-center mt-4 text-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
            </div>
            <div className="flex gap-2">
              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(Number(pageNum))}
                  disabled={pageNum === currentPage}
                  className={`px-3 py-1 rounded ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Lines Column */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Product Lines</h2>
          <div className="text-sm text-gray-400">
            Selected company: <strong>{selectedCompany?.name || 'None'}</strong>
          </div>
          <div className="text-sm italic text-gray-500">
            {!selectedCompany 
              ? '* Please select a company to manage its product lines'
              : productLines.length === 0
                ? '* No product lines yet'
                : `This company has ${productLines.length} product line(s)`}
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <button 
            className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            onClick={() => setShowAddLine(true)}
            disabled={!selectedCompany}
          >
            + Add Product Line
          </button>
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Product Line Name</div>
          <div className="w-20"></div>
        </div>

        {/* Table Content */}
        <div className="space-y-1">
          {productLines.map(line => (
            <div 
              key={line.id}
              onClick={() => setSelectedLine(line)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                selectedLine?.id === line.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span>{line.name}</span>
              <div className="flex gap-1 w-20 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedLine(line)
                    setNewName(line.name)
                    setShowEditLine(true)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProductLine(line)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Sets Column */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Product Sets</h2>
          <div className="text-sm text-gray-400">
            Selected line: <strong>{selectedLine?.name || 'None'}</strong>
          </div>
          <div className="text-sm italic text-gray-500">
            {!selectedLine 
              ? '* Please select a product line to manage its sets'
              : productSets.length === 0
                ? '* No product sets yet'
                : `This line has ${productSets.length} product set(s)`}
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <button 
            className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            onClick={() => setShowAddSet(true)}
            disabled={!selectedLine}
          >
            + Add Product Set
          </button>
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Product Set Name</div>
          <div className="w-20"></div>
        </div>

        {/* Table Content */}
        <div className="space-y-1">
          {productSets.map(set => (
            <div 
              key={set.id}
              onClick={() => setSelectedSet(set)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                selectedSet?.id === set.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span>{set.name}</span>
              <div className="flex gap-1 w-20 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSet(set)
                    setNewName(set.name)
                    setShowEditSet(true)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProductSet(set)
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}