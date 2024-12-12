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

  // Consolidated modal state
  const [modalState, setModalState] = useState<{
    type: 'add' | 'edit' | 'delete' | 'categories' | null
    isOpen: boolean
    data?: any
  }>({ type: null, isOpen: false })

  // Essential state
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)

  const {
    miniTypes,
    categories,
    selectedTypeCategories,
    loadData,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories,
    checkTypeUsage
  } = useTypeCategoryAdmin()

  const { showSuccess, showError } = useNotifications()

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

  const handleTypeSelect = async (type: MiniType) => {
    setSelectedType(type)
    const result = await loading.withLoading(loadTypeCategoryIds(type.id))
    if (result?.error) {
      showError(result.error)
    }
  }

  const handleDeleteClick = async (type: MiniType) => {
    const { canDelete, error, inUseBy } = await loading.withLoading(
      checkTypeUsage(type.id)
    )
    
    if (error) {
      showError(error)
      return
    }

    if (!canDelete) {
      showError(`Cannot delete "${type.name}" because it is in use by ${
        inUseBy?.minis ? 'minis' : ''
      }${inUseBy?.minis && inUseBy?.categories ? ' and ' : ''}${
        inUseBy?.categories ? 'categories' : ''
      }`)
      return
    }

    setModalState({ type: 'delete', isOpen: true, data: type })
  }

  const handleModalClose = () => {
    setModalState({ type: null, isOpen: false })
  }

  const handleModalAction = async (action: string, data?: any) => {
    try {
      switch (action) {
        case 'add':
          const addResult = await loading.withLoading(addType(data))
          if (addResult.error) {
            showError(addResult.error)
            return
          }
          showSuccess('Type added successfully')
          break

        case 'edit':
          const editResult = await loading.withLoading(editType(modalState.data.id, data))
          if (editResult.error) {
            showError(editResult.error)
            return
          }
          showSuccess('Type updated successfully')
          break

        case 'delete':
          const deleteResult = await loading.withLoading(deleteType(modalState.data.id))
          if (deleteResult.error) {
            showError(deleteResult.error)
            return
          }
          showSuccess('Type deleted successfully')
          break

        case 'updateCategories':
          const updateResult = await loading.withLoading(
            updateTypeCategories(selectedType!.id, data)
          )
          if (updateResult.error) {
            showError(updateResult.error)
            return
          }
          showSuccess('Categories updated successfully')
          break
      }
      handleModalClose()
    } catch (error) {
      showError('An error occurred')
    }
  }

  const getHeaderItalicText = () => {
    if (!selectedType) return "Select a type to manage its categories"
    return `${selectedTypeCategories.length} ${selectedTypeCategories.length === 1 ? 'category' : 'categories'} assigned`
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
          onAdd={() => setModalState({ type: 'add', isOpen: true })}
          onEdit={(type) => setModalState({ type: 'edit', isOpen: true, data: type })}
          onDelete={handleDeleteClick}
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
              setSelectedType(null)
            }
          }}
          getItemName={(item) => item.name}
        />
      </div>

      {/* Categories Section */}
      <div className="col-span-3">
        <UI.AdminTableSection
          title="Categories"
          icon={FaListAlt}
          iconColor="text-blue-700"
          items={categories.filter(cat => selectedTypeCategories.includes(cat.id))}
          selectedItem={null}
          onAdd={() => setModalState({ type: 'categories', isOpen: true })}
          onDelete={async (category) => {
            if (!selectedType) return
            const newCategories = selectedTypeCategories.filter(id => id !== category.id)
            handleModalAction('updateCategories', newCategories)
          }}
          addButtonLabel="Manage"
          addButtonDisabled={!selectedType}
          loading={loading.isLoading}
          headerSubText={`Selected type: ${selectedType?.name || 'None'}`}
          headerItalicText={getHeaderItalicText()}
          emptyMessage={!selectedType ? "Select a type to view categories" : "No categories assigned"}
          getItemName={(item) => item.name}
        />
      </div>

      {/* Modals */}
      <AddTypeModal
        isOpen={modalState.type === 'add'}
        onClose={handleModalClose}
        onSubmit={(name) => handleModalAction('add', name)}
        isLoading={loading.isLoading}
      />

      <EditTypeModal
        isOpen={modalState.type === 'edit'}
        onClose={handleModalClose}
        onSubmit={(name) => handleModalAction('edit', name)}
        initialName={modalState.data?.name || ''}
        isLoading={loading.isLoading}
      />

      <ManageCategoriesModal
        isOpen={modalState.type === 'categories' && !!selectedType}
        onClose={handleModalClose}
        onSubmit={(categoryIds) => handleModalAction('updateCategories', categoryIds)}
        categories={categories}
        selectedCategoryIds={selectedTypeCategories}
        isLoading={loading.isLoading}
      />

      <DeleteTypeConfirmationModal
        isOpen={modalState.type === 'delete'}
        onClose={handleModalClose}
        onConfirm={() => handleModalAction('delete')}
        typeName={modalState.data?.name || ''}
      />
    </div>
  )
} 