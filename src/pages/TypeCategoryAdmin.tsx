import { useState, useEffect } from 'react'
import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import type { MiniType } from '../lib/supabase'
import AddTypeModal from '../components/AddTypeModal'
import EditTypeModal from '../components/EditTypeModal'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import DeleteTypeConfirmationModal from '../components/DeleteTypeConfirmationModal'
import * as UI from '../components/ui'
import { FaArchive, FaListAlt } from 'react-icons/fa'

export default function TypeCategoryAdmin() {
  // Admin hooks
  const [totalTypes, setTotalTypes] = useState(0)
  const pagination = useAdminPagination({ 
    itemsPerPage: 10,
    totalItems: totalTypes 
  })
  const search = useAdminSearch({ searchFields: ['name'] })
  const loading = useAdminLoading()

  // State
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false)
  const [typeToEdit, setTypeToEdit] = useState<MiniType | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [typeToDelete, setTypeToDelete] = useState<MiniType | null>(null)
  const [deleteError, setDeleteError] = useState('')

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

  const { showSuccess, showError, showWarning } = useNotifications()

  // Load data with pagination and search
  useEffect(() => {
    const fetchData = async () => {
      const { data, count, error } = await loading.withLoading(
        loadData(
          (pagination.currentPage - 1) * pagination.itemsPerPage,
          pagination.itemsPerPage,
          search.searchTerm
        )
      )
      if (error) {
        showError(error)
        return
      }
      if (count !== undefined) {
        setTotalTypes(count)
      }
    }
    fetchData()
  }, [pagination.currentPage, search.searchTerm])

  // Keep current page within bounds when total changes
  useEffect(() => {
    const maxPage = Math.ceil(totalTypes / pagination.itemsPerPage)
    if (maxPage > 0 && pagination.currentPage > maxPage) {
      pagination.handlePageChange(maxPage)
    }
  }, [totalTypes, pagination.itemsPerPage])

  const handleTypeSelect = async (type: MiniType) => {
    try {
      setSelectedType(type)
      const result = await loading.withLoading(loadTypeCategoryIds(type.id))
      if (result?.error) {
        showError(result.error)
      }
    } catch (error) {
      showError('An error occurred while loading categories')
    }
  }

  // Delete handling
  const handleDeleteClick = async (type: MiniType) => {
    setDeleteError('')
    const { canDelete, error, inUseBy } = await loading.withLoading(
      checkTypeUsage(type.id)
    )
    
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

    setTypeToDelete(type)
  }

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return

    const { error } = await loading.withLoading(deleteType(typeToDelete.id))
    if (error) {
      setDeleteError(error)
    } else {
      showSuccess('Type deleted successfully')
      setTypeToDelete(null)
      setDeleteError('')
    }
  }

  const getHeaderItalicText = () => {
    if (!selectedType) {
      return '* Please select a type to manage its category relationship(s).'
    }
    if (selectedTypeCategories.length === 0) {
      return '* There is no category relationship setup yet'
    }
    return `This type has ${selectedTypeCategories.length} category ${
      selectedTypeCategories.length === 1 ? 'relationship' : 'relationships'
    }.`
  }

  const handleAddType = async (name: string) => {
    if (!name.trim()) {
      showError('Name is required')
      return
    }

    const result = await loading.withLoading(addType(name))
    
    if (result.error) {
      showError(result.error)
      return
    }
    
    showSuccess('Type added successfully')
    setIsAddTypeModalOpen(false)
  }

  const handleDeleteType = async (id: number) => {
    try {
      await deleteType(id)
      showSuccess('Type deleted successfully')
    } catch (error) {
      showWarning('Cannot delete type that has categories')
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Types Section */}
      <div className="col-span-3">
        <UI.AdminTableSection
          title="Mini Types"
          icon={FaArchive}
          items={miniTypes}
          selectedItem={selectedType}
          onSelect={handleTypeSelect}
          onAdd={() => setIsAddTypeModalOpen(true)}
          onEdit={(type) => {
            setTypeToEdit(type)
            loadTypeCategoryIds(type.id)
          }}
          onDelete={(type) => handleDeleteClick(type)}
          loading={loading.isLoading}
          headerSubText="Manage mini types"
          searchProps={{
            ...search.searchProps,
            placeholder: "Search mini types..."
          }}
          pagination={{
            currentPage: pagination.currentPage,
            totalItems: totalTypes,
            itemsPerPage: pagination.itemsPerPage,
            onPageChange: (page) => {
              pagination.handlePageChange(page)
              setSelectedType(null) // Clear selection when changing pages
            }
          }}
          getItemName={(item) => item.name}
        />
      </div>

      {/* Right Column - Categories */}
      <div className="col-span-3">
        <UI.AdminTableSection
          title="Categories"
          icon={FaListAlt}
          iconColor="text-blue-700"
          items={categories.filter(cat => selectedTypeCategories.includes(cat.id))}
          selectedItem={null}
          onAdd={() => setIsCategoryModalOpen(true)}
          onDelete={async (category) => {
            if (!selectedType) return
            const newCategories = selectedTypeCategories.filter(id => id !== category.id)
            const result = await loading.withLoading(
              updateTypeCategories(selectedType.id, newCategories)
            )
            if (!result.error) {
              showSuccess('Category link removed successfully')
            }
          }}
          addButtonDisabled={!selectedType}
          loading={loading.isLoading}
          headerSubText={`Selected type: ${selectedType?.name || 'None'}`}
          headerItalicText={getHeaderItalicText()}
          emptyMessage={!selectedType ? "Select a type to view categories" : "No categories assigned"}
          getItemName={(item) => item.name}
        />
      </div>

      {/* Modals */}
      {isAddTypeModalOpen && (
        <AddTypeModal
          isOpen={isAddTypeModalOpen}
          onClose={() => setIsAddTypeModalOpen(false)}
          onSubmit={handleAddType}
          isLoading={loading.isLoading}
        />
      )}

      {typeToEdit && (
        <EditTypeModal
          isOpen={!!typeToEdit}
          onClose={() => setTypeToEdit(null)}
          onSubmit={async (name) => {
            const result = await loading.withLoading(editType(typeToEdit.id, name))
            if (!result.error) {
              showSuccess('Type updated successfully')
              setTypeToEdit(null)
            }
          }}
          initialName={typeToEdit.name}
          isLoading={loading.isLoading}
        />
      )}

      {selectedType && isCategoryModalOpen && (
        <ManageCategoriesModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={async (categoryIds) => {
            const result = await loading.withLoading(
              updateTypeCategories(selectedType.id, categoryIds)
            )
            if (!result.error) {
              showSuccess('Categories updated successfully')
              setIsCategoryModalOpen(false)
            }
          }}
          categories={categories}
          selectedCategoryIds={selectedTypeCategories}
          isLoading={loading.isLoading}
        />
      )}

      <DeleteTypeConfirmationModal
        isOpen={!!typeToDelete}
        onClose={() => setTypeToDelete(null)}
        onConfirm={handleDeleteConfirm}
        typeName={typeToDelete?.name || ''}
      />

      {error && showError(error)}
    </div>
  )
} 