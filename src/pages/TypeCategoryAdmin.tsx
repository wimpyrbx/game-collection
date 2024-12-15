import { useState, useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import * as UI from '../components/ui'
import { PageHeader, PageHeaderIcon, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { FaArchive, FaSchlix, FaShareAltSquare, FaUsersCog, FaExclamationTriangle } from 'react-icons/fa'

import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import type { MiniType, MiniCategory } from '../lib/supabase'
import AddTypeModal from '../components/AddTypeModal'
import EditTypeModal from '../components/EditTypeModal'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import DeleteTypeConfirmationModal from '../components/DeleteTypeConfirmationModal'
import { CategoryModal } from '../components/typecategoryadmin/CategoryModal'
import { DeleteConfirmModal } from '../components/ui'

export default function TypeCategoryAdmin() {
  // Essential state
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false)
  const [totalCategories, setTotalCategories] = useState(0)
  const [categories, setCategories] = useState<MiniCategory[]>([])
  const [typesWithoutCategoriesCount, setTypesWithoutCategoriesCount] = useState(0)

  const {
    miniTypes,
    selectedTypeCategories,
    loadData,
    addType,
    editType,
    deleteType,
    addCategory,
    editCategory,
    deleteCategory,
    updateTypeCategories,
    checkTypeUsage,
    loadTypeCategoryIds,
    loadCategories,
    totalCount
  } = useTypeCategoryAdmin()

  const { showSuccess, showError } = useNotifications()
  const loading = useAdminLoading()

  // Pagination and search for types
  const pagination = useAdminPagination({
    itemsPerPage: 10,
    totalItems: totalCount
  })

  const search = useAdminSearch({
    searchFields: ['name']
  })

  // Pagination and search for categories
  const categoryPagination = useAdminPagination({
    itemsPerPage: pagination.itemsPerPage,
    totalItems: totalCategories
  })

  const categorySearch = useAdminSearch({
    searchFields: ['name']
  })

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: cats, count } = await loadCategories(
        0,
        pagination.itemsPerPage,
        categorySearch.searchTerm
      )
      if (cats) {
        setCategories(cats)
      }
      if (count !== undefined && count !== null) {
        setTotalCategories(count)
      }
      categoryPagination.setCurrentPage(1)
    }
    fetchCategories()
  }, [categorySearch.searchTerm])

  // Load data when page changes
  useEffect(() => {
    const fetchData = async () => {
      await loadData(
        (pagination.currentPage - 1) * pagination.itemsPerPage,
        pagination.itemsPerPage,
        search.searchTerm
      )
    }
    fetchData()
  }, [pagination.currentPage, search.searchTerm])

  // Initial load of categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data: cats, count } = await loadCategories(
        (categoryPagination.currentPage - 1) * pagination.itemsPerPage,
        pagination.itemsPerPage,
        categorySearch.searchTerm
      )
      if (cats) {
        setCategories(cats)
      }
      if (count !== undefined && count !== null) {
        setTotalCategories(count)
      } else {
        setTotalCategories(0)
      }
    }
    fetchCategories()
  }, [categoryPagination.currentPage])

  // Load initial data and counts
  useEffect(() => {
    const fetchInitialData = async () => {
      const result = await loadData()
      if (result?.typesWithoutCategories !== undefined) {
        setTypesWithoutCategoriesCount(result.typesWithoutCategories)
      }
      const catResult = await loadCategories(0, pagination.itemsPerPage, '')
      if (catResult?.count !== undefined && catResult?.count !== null) {
        setTotalCategories(catResult.count)
      } else {
        setTotalCategories(0)
      }
    }
    fetchInitialData()
  }, [])

  // Update counts when data changes
  useEffect(() => {
    const fetchCounts = async () => {
      const result = await loadData()
      if (result?.typesWithoutCategories !== undefined) {
        setTypesWithoutCategoriesCount(result.typesWithoutCategories)
      }
    }
    fetchCounts()
  }, [categories.length, totalCategories])

  // Modal state management
  const [modalState, setModalState] = useState<{
    type: string | null
    isOpen: boolean
    data?: any
  }>({
    type: null,
    isOpen: false
  })

  // Add state for the category being unlinked
  const [unlinkCategory, setUnlinkCategory] = useState<{
    category: MiniCategory | null,
    isOpen: boolean
  }>({
    category: null,
    isOpen: false
  })

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
      let result;
      switch (action) {
        case 'add':
          result = await loading.withLoading(addType(data))
          if (result.error) {
            showError(result.error)
            return
          }
          showSuccess('Type added successfully')
          break

        case 'edit':
          result = await loading.withLoading(editType(modalState.data.id, data))
          if (result.error) {
            showError(result.error)
            return
          }
          showSuccess('Type updated successfully')
          break

        case 'delete':
          result = await loading.withLoading(deleteType(modalState.data.id))
          if (result.error) {
            showError(result.error)
            return
          }
          showSuccess('Type deleted successfully')
          break

        case 'updateCategories':
          result = await loading.withLoading(
            updateTypeCategories(selectedType!.id, data)
          )
          if (result.error) {
            showError(result.error)
            return
          }
          showSuccess('Categories updated successfully')
          break

        case 'addCategory':
          if (!data || !data.trim()) {
            showError('Category name is required')
            return
          }
          result = await loading.withLoading(addCategory(data))
          if (result.error) {
            showError(result.error.message || 'Failed to add category')
            return
          }
          showSuccess('Category added successfully')
          // Refresh categories with current pagination
          const addResult = await loadCategories(
            (categoryPagination.currentPage - 1) * pagination.itemsPerPage,
            pagination.itemsPerPage,
            categorySearch.searchTerm
          )
          if (addResult.data) {
            setCategories(addResult.data)
          }
          if (addResult.count !== undefined && addResult.count !== null) {
            setTotalCategories(addResult.count)
          }
          break

        case 'editCategory':
          result = await loading.withLoading(editCategory(modalState.data.id, data))
          if (result.error) {
            showError(typeof result.error === 'object' && 'message' in result.error 
              ? String(result.error.message)
              : 'Failed to update category')
            return
          }
          showSuccess('Category updated successfully')
          // Refresh categories with current pagination
          const editResult = await loadCategories(
            (categoryPagination.currentPage - 1) * pagination.itemsPerPage,
            pagination.itemsPerPage,
            categorySearch.searchTerm
          )
          if (editResult.data) {
            setCategories(editResult.data)
          }
          if (editResult.count !== undefined && editResult.count !== null) {
            setTotalCategories(editResult.count)
          }
          break

        case 'deleteCategory':
          result = await loading.withLoading(deleteCategory(modalState.data.id))
          if (result.error) {
            showError(typeof result.error === 'object' && result.error && 'message' in result.error 
              ? String(result.error.message) 
              : 'Failed to delete category')
            return
          }
          showSuccess('Category deleted successfully')
          // Refresh categories with current pagination
          const deleteResult = await loadCategories(
            (categoryPagination.currentPage - 1) * pagination.itemsPerPage,
            pagination.itemsPerPage,
            categorySearch.searchTerm
          )
          if (deleteResult.data) {
            setCategories(deleteResult.data)
          }
          if (deleteResult.count !== undefined && deleteResult.count !== null) {
            setTotalCategories(deleteResult.count)
          }
          break
      }
      handleModalClose()
    } catch (error) {
      console.error('Error in handleModalAction:', error)
      showError('An unexpected error occurred')
    }
  }

  const getHeaderItalicText = () => {
    if (!selectedType) return "Select a type to manage its categories"
    return `${selectedTypeCategories.length} ${selectedTypeCategories.length === 1 ? 'category' : 'categories'} assigned`
  }

  // Add handler for unlink confirmation
  const handleUnlinkConfirm = async () => {
    if (!selectedType || !unlinkCategory.category) return
    const newCategories = selectedTypeCategories.filter(id => id !== unlinkCategory.category!.id)
    await handleModalAction('updateCategories', newCategories)
    setUnlinkCategory({ category: null, isOpen: false })
  }

  return (
    <>
      <PageHeader bgColor="none">
        <PageHeaderTextGroup>
          <PageHeaderText>Mini Types and Categories</PageHeaderText>
          <PageHeaderSubText>Manage your collection of mini types and their categories</PageHeaderSubText>
        </PageHeaderTextGroup>
          <PageHeaderBigNumber
            icon={FaArchive}
            number={totalCount}
            text="Total Types"
          />
          <PageHeaderBigNumber
            icon={FaShareAltSquare}
            number={totalCategories}
            text="Total Categories"
          />
          <PageHeaderBigNumber
            icon={FaExclamationTriangle}
            number={typesWithoutCategoriesCount}
            text="Types Without Categories"
            iconClassName="text-yellow-400"
          />
      </PageHeader>

      <div className="grid grid-cols-12 gap-4">
        {/* Types Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Mini Types"
            icon={FaUsersCog}
            iconColor="text-blue-700"
            items={showUnlinkedOnly ? miniTypes.filter(miniType => 
              !selectedTypeCategories.includes(miniType.id)
            ) : miniTypes}
            selectedItem={selectedType}
            onSelect={handleTypeSelect}
            onAdd={() => setModalState({ type: 'add', isOpen: true })}
            onEdit={(type) => setModalState({ type: 'edit', isOpen: true, data: type })}
            onDelete={handleDeleteClick}
            loading={loading.isLoading}
            headerSubText="Manage mini types"
            headerItalicText="* Click on a type to manage its categories"
            searchProps={{
              ...search.searchProps,
              placeholder: "Search mini types...",
              rightElement: (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={showUnlinkedOnly}
                      onChange={(e) => setShowUnlinkedOnly(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-500 bg-gray-700 focus:ring-blue-500"
                    />
                    Unlinked
                  </label>
                </div>
              )
            }}
            pagination={{
              currentPage: pagination.currentPage,
              totalItems: totalCount,
              itemsPerPage: pagination.itemsPerPage,
              onPageChange: (page) => {
                pagination.handlePageChange(page)
                setSelectedType(null)
              }
            }}
            getItemName={(item) => item.name}
          />
        </div>

        {/* Assigned Categories Section */}
        <div className="col-span-4">
          <UI.AdminTableSection
            title="Type » Categories"
            icon={FaShareAltSquare}
            iconColor="text-blue-700"
            items={categories.filter(cat => selectedTypeCategories.includes(cat.id))}
            selectedItem={null}
            onAdd={() => setModalState({ type: 'categories', isOpen: true })}
            onDelete={async (category) => {
              if (!selectedType) return
              setUnlinkCategory({ category, isOpen: true })
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

        <div className="col-span-1">
        </div>

        {/* Categories Section */}
        <div className="col-span-3">
          <UI.AdminTableSection
            title="Category List"
            icon={FaSchlix}
            iconColor="text-blue-700"
            items={categories}
            selectedItem={null}
            onAdd={() => setModalState({ type: 'addCategory', isOpen: true })}
            onEdit={(category) => setModalState({ 
              type: 'editCategory', 
              isOpen: true, 
              data: category 
            })}
            onDelete={(category) => setModalState({
              type: 'deleteCategory',
              isOpen: true,
              data: category
            })}
            loading={loading.isLoading}
            headerSubText="Manage all categories"
            headerItalicText="* Add/Edit/Delete categories"
            searchProps={{
              ...categorySearch.searchProps,
              placeholder: "Search categories..."
            }}
            pagination={{
              currentPage: categoryPagination.currentPage,
              totalItems: totalCategories,
              itemsPerPage: categoryPagination.itemsPerPage,
              onPageChange: categoryPagination.handlePageChange
            }}
            getItemName={(item) => item.name}
          />
        </div>
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

      <CategoryModal
        isOpen={['addCategory', 'editCategory'].includes(modalState.type || '')}
        onClose={handleModalClose}
        onSubmit={(name) => handleModalAction(modalState.type || '', name)}
        category={modalState.type === 'editCategory' ? modalState.data : null}
        isLoading={loading.isLoading}
      />

      <DeleteConfirmModal
        isOpen={modalState.type === 'deleteCategory'}
        onClose={handleModalClose}
        onConfirm={() => handleModalAction('deleteCategory')}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${modalState.data?.name}"?`}
        isLoading={loading.isLoading}
        itemName={modalState.data?.name || ''}
      />

      <DeleteConfirmModal
        isOpen={unlinkCategory.isOpen}
        onClose={() => setUnlinkCategory({ category: null, isOpen: false })}
        onConfirm={handleUnlinkConfirm}
        title="Unlink Category"
        message={`Are you sure you want to unlink the category "${unlinkCategory.category?.name}" from type "${selectedType?.name}"?`}
        isLoading={loading.isLoading}
        itemName={unlinkCategory.category?.name || ''}
      />
    </>
  )
} 