import { useState, useEffect } from 'react'
import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import type { MiniType } from '../lib/supabase'
import AddTypeModal from '../components/AddTypeModal'
import EditTypeModal from '../components/EditTypeModal'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import DeleteTypeConfirmationModal from '../components/DeleteTypeConfirmationModal'
import * as UI from '../components/ui'
import { FaAd, FaAdjust, FaAlgolia, FaArchive, FaList, FaListAlt, FaListOl, FaListUl, FaThList, FaUserCog, FaUsers } from 'react-icons/fa'

export default function TypeCategoryAdmin() {
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false)
  const [typeToEdit, setTypeToEdit] = useState<MiniType | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [typeToDelete, setTypeToDelete] = useState<MiniType | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    miniTypes,
    categories,
    selectedTypeCategories,
    error,
    loadData,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories,
    checkTypeUsage
  } = useTypeCategoryAdmin()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      await loadData(currentPage, 10, searchTerm)
      setIsLoading(false)
    }
    fetchData()
  }, [currentPage, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleTypeSelect = async (type: MiniType) => {
    setSelectedType(type)
    await loadTypeCategoryIds(type.id)
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
      <UI.Card className="flex-1">
        <UI.CardHeader>
          <div className="flex">
            <UI.CardIcon size="big" className="text-green-700">
              <FaArchive />
            </UI.CardIcon>
            <div>
              <UI.CardHeaderText>
                Character Type
              </UI.CardHeaderText>
              <UI.CardHeaderSubText>
                Select a character type to set category relationship(s).
              </UI.CardHeaderSubText>
              <UI.CardHeaderItalicText>
                * Each type can have 0 or any number of categories assigned
              </UI.CardHeaderItalicText>
            </div>
          </div>
          <UI.CardHeaderRightSide>
            <UI.Button 
              variant="btnSuccess"
              onClick={() => setIsAddTypeModalOpen(true)}
            >
              + Add Type
            </UI.Button>
          </UI.CardHeaderRightSide>
        </UI.CardHeader>

        <UI.CardBody>
          <div className="mb-4">
            <UI.SearchInput
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Filter types..."
              className="w-full"
            />
          </div>

          {isLoading ? (
            <UI.LoadingSpinner message="Loading types..." />
          ) : error ? (
            <UI.ErrorState 
              message="Failed to load types" 
              onRetry={() => handlePageChange(currentPage)} 
            />
          ) : (
            <>
              <UI.TableHeader title="Type Name" />
              <div className="space-y-1 min-h-[200px]">
                {miniTypes.length === 0 ? (
                  <div className="p-4 text-gray-400 text-center">
                    No types found
                  </div>
                ) : (
                  miniTypes.map(type => (
                    <UI.TableRow
                      key={type.id}
                      title={type.name}
                      isSelected={selectedType?.id === type.id}
                      onSelect={() => handleTypeSelect(type)}
                      onEdit={() => setTypeToEdit(type)}
                      onDelete={() => handleDeleteClick(type)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </UI.CardBody>

      </UI.Card>




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

      {/* Error states */}
      {deleteError && <UI.Toast message={deleteError} type="warning" />}
      {error && <UI.ErrorState message={error} />}

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
    </div>
  )
} 