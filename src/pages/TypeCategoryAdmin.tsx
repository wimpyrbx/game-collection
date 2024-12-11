import { useState, useEffect } from 'react'
import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import type { MiniType } from '../lib/supabase'
import AddTypeModal from '../components/AddTypeModal'
import EditTypeModal from '../components/EditTypeModal'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import DeleteTypeConfirmationModal from '../components/DeleteTypeConfirmationModal'

export default function TypeCategoryAdmin() {
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false)
  const [typeToEdit, setTypeToEdit] = useState<MiniType | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [searchType, setSearchType] = useState('')
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput] = useState('')
  const [typeToDelete, setTypeToDelete] = useState<MiniType | null>(null)
  const [deleteError, setDeleteError] = useState('')
  
  const {
    miniTypes,
    categories,
    selectedTypeCategories,
    totalCount,
    error,
    loadData,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories,
    checkTypeUsage
  } = useTypeCategoryAdmin()

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  useEffect(() => {
    loadData(currentPage, ITEMS_PER_PAGE, searchType)
  }, [currentPage, searchType])

  const handleTypeSelect = async (type: MiniType) => {
    setSelectedType(type)
    await loadTypeCategoryIds(type.id)
  }

  const handleSearch = (value: string) => {
    setSearchType(value)
    setCurrentPage(1)
  }



  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = []
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return pageNumbers
  }

  // Add styles to head of document for custom scrollbar
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .custom-select::-webkit-scrollbar {
        width: 8px;
      }
      .custom-select::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
      }
      .custom-select::-webkit-scrollbar-thumb {
        background: #4a5568;
        border-radius: 4px;
      }
      .custom-select::-webkit-scrollbar-thumb:hover {
        background: #718096;
      }
      .custom-select option {
        padding: 8px;
        background: #2d3748;
      }
      .custom-select option:hover {
        background: #4a5568;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Separate check and confirmation flow
  const handleDeleteClick = async (type: MiniType) => {
    setDeleteError('') // Clear any previous errors
    const { canDelete, error, inUseBy } = await checkTypeUsage(type.id)
    
    if (error) {
      setDeleteError(error)
      return
    }

    if (!canDelete) {
      setDeleteError(`Cannot delete "${type.name}" because it is in use by ${
        inUseBy?.minis ? 'minis' : ''
      }${inUseBy?.minis && inUseBy?.categories ? ' and ' : ''}${
        inUseBy?.categories ? 'categories' : ''
      }`)
      return
    }

    // If we can delete, show the confirmation modal
    setTypeToDelete(type)
  }

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return

    const { error } = await deleteType(typeToDelete.id)
    if (error) {
      setDeleteError(error)
    } else {
      setTypeToDelete(null)
      setDeleteError('')
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left Column - Types */}
      <div className="flex-1">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">Character Types</h2>
            <div className="text-sm text-gray-400">
              Select a character type to set category relationship(s).
            </div>
            <div className="text-sm italic text-gray-500">
              * Each type can have 0 or any number of categories assigned
            </div>
          </div>
          <button 
            className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
            onClick={() => setIsAddTypeModalOpen(true)}
          >
            + Add Type
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter types..."
            value={searchType}
            onChange={(e) => {
              handleSearch(e.target.value)
            }}
            className="bg-gray-700 p-2 rounded w-64"
          />
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Type Name</div>
          <div className="w-20"></div>
        </div>

        {/* Table Content */}
        <div className="space-y-1">
          {miniTypes.map(type => (
            <div 
              key={type.id}
              onClick={() => handleTypeSelect(type)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                selectedType?.id === type.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{type.name}</span>
              </div>
              <div className="flex gap-1 w-20 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setTypeToEdit(type);
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
                    handleDeleteClick(type)
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
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Optional error message for invalid page input */}
        {pageInput && parseInt(pageInput) > totalPages && (
          <div className="text-red-500 text-sm mt-2 text-center">
            Please enter a page number between 1 and {totalPages}
          </div>
        )}
      </div>

      {/* Right Column - Categories */}
      <div className="flex-1">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">Categories</h2>
            <div className="text-sm text-gray-400">
              Selected type: <strong>{selectedType?.name || 'None'}</strong>
            </div>
            <div className="text-sm italic text-gray-500">
              {!selectedType 
                ? '* Please select a type to manage its category relationship(s).'
                : selectedTypeCategories.length === 0
                  ? '* There is no category relationship setup yet'
                  : `This type has ${selectedTypeCategories.length} category ${
                      selectedTypeCategories.length === 1 ? 'relationship' : 'relationships'
                    }.`}
            </div>
          </div>
          {selectedType && (
            <button 
              className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              + Manage Categories
            </button>
          )}
        </div>

        {selectedType && selectedTypeCategories.length > 0 && (
          <>
            {/* Table Header */}
            <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
              <div className="font-medium">Category Name</div>
              <div className="w-10"></div>
            </div>

            {/* Table Content */}
            <div className="space-y-1">
              {categories
                .filter(cat => selectedTypeCategories.includes(cat.id))
                .map(category => (
                  <div 
                    key={category.id}
                    className="bg-gray-800 p-2 rounded flex justify-between items-center"
                  >
                    <span>{category.name}</span>
                    <div className="w-10"></div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      <AddTypeModal
        isOpen={isAddTypeModalOpen}
        onClose={() => setIsAddTypeModalOpen(false)}
        onAdd={addType}
      />

      <EditTypeModal
        type={typeToEdit}
        isOpen={typeToEdit !== null}
        onClose={() => setTypeToEdit(null)}
        onEdit={editType}
      />

      <ManageCategoriesModal
        type={selectedType}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        selectedCategories={selectedTypeCategories}
        onSave={(categoryIds) => updateTypeCategories(selectedType?.id || 0, categoryIds)}
      />

      {/* Error toast */}
      {deleteError && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 text-white px-4 py-2 rounded shadow-lg">
          {deleteError}
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteTypeConfirmationModal
        isOpen={!!typeToDelete}
        onClose={() => {
          setTypeToDelete(null)
          setDeleteError('')
        }}
        onConfirm={handleDeleteConfirm}
        typeName={typeToDelete?.name || ''}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
} 