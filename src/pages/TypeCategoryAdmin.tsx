import { useState, useEffect, useCallback } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAdminPagination, useAdminSearch, useAdminLoading } from '../hooks'
import * as UI from '../components/ui'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { FaArchive, FaSchlix, FaShareAltSquare, FaUsersCog, FaExclamationTriangle } from 'react-icons/fa'

import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import type { MiniType, MiniCategory } from '../types/mini'
import { AddTypeModal, EditTypeModal, ManageCategoriesModal, CategoryModal } from '../components/typecategoryadmin'
import { supabase } from '../lib/supabase'

export default function TypeCategoryAdmin() {
  // Essential state
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false)
  const [totalCategories, setTotalCategories] = useState(0)
  const [categories, setCategories] = useState<MiniCategory[]>([])
  const [allCategories, setAllCategories] = useState<MiniCategory[]>([])
  const [typesWithoutCategoriesCount, setTypesWithoutCategoriesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

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
    searchFields: ['name'],
    debounceMs: 300,
    onSearch: (term) => {
      if (!isLoading && term.trim() !== search.debouncedSearchTerm) {
        pagination.setCurrentPage(1)
        handleLoadTypes(0, pagination.itemsPerPage, term)
      }
    }
  })

  // Pagination and search for categories
  const categoryPagination = useAdminPagination({
    itemsPerPage: pagination.itemsPerPage,
    totalItems: totalCategories
  })

  const categorySearch = useAdminSearch({
    searchFields: ['name'],
    debounceMs: 300,
    onSearch: (term) => {
      if (!isLoading && term.trim() !== categorySearch.debouncedSearchTerm) {
        categoryPagination.setCurrentPage(1)
        handleLoadCategories(0, categoryPagination.itemsPerPage, term)
      }
    }
  })

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (isLoading) return
      setIsLoading(true)
      try {
        const result = await loadData(0, pagination.itemsPerPage, '')
        if (result?.typesWithoutCategories !== undefined) {
          setTypesWithoutCategoriesCount(result.typesWithoutCategories)
        }
        
        // Load initial categories
        const catResult = await loadCategories(0, categoryPagination.itemsPerPage, '')
        if (catResult.data) {
          setCategories(catResult.data)
        }
        if (catResult.count !== undefined && catResult.count !== null) {
          console.log('Setting initial total categories to:', catResult.count)
          setTotalCategories(catResult.count)
        }
        
        // Load all categories for the type-categories section
        await loadAllCategories()
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, []) // Only run once on mount

  const handleLoadTypes = async (offset: number, limit: number, searchTerm: string) => {
    const result = await loadData(offset, limit, searchTerm)
    if (result?.typesWithoutCategories !== undefined) {
      setTypesWithoutCategoriesCount(result.typesWithoutCategories)
    }
  }

  const handleLoadCategories = async (offset: number, limit: number, searchTerm: string) => {
    const result = await loadCategories(offset, limit, searchTerm)
    if (result.data) {
      setCategories(result.data)
    }
    // Only update total categories count if it's not a search result
    if (!searchTerm && result.count !== undefined && result.count !== null) {
      console.log('Updating total categories to:', result.count)
      setTotalCategories(result.count)
    }
    return result
  }

  // Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    if (isLoading) return
    setIsLoading(true)
    pagination.setCurrentPage(page)
    const offset = (page - 1) * pagination.itemsPerPage
    handleLoadTypes(offset, pagination.itemsPerPage, search.debouncedSearchTerm)
      .finally(() => setIsLoading(false))
  }, [pagination, search.debouncedSearchTerm])

  const handleCategoryPageChange = useCallback((page: number) => {
    if (isLoading) return
    setIsLoading(true)
    categoryPagination.setCurrentPage(page)
    const offset = (page - 1) * categoryPagination.itemsPerPage
    handleLoadCategories(offset, categoryPagination.itemsPerPage, categorySearch.debouncedSearchTerm)
      .finally(() => setIsLoading(false))
  }, [categoryPagination, categorySearch.debouncedSearchTerm])

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
      const currentOffset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const currentCategoryOffset = (categoryPagination.currentPage - 1) * categoryPagination.itemsPerPage;

      switch (action) {
        case 'add':
          result = await loading.withLoading(addType(data))
          if (result.error) {
            showError(result.error)
            return
          }
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
          showSuccess('Type added successfully')
          break

        case 'edit':
          result = await loading.withLoading(editType(modalState.data.id, data))
          if (result.error) {
            showError(result.error)
            return
          }
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
          showSuccess('Type updated successfully')
          break

        case 'delete':
          result = await loading.withLoading(deleteType(modalState.data.id))
          if (result.error) {
            showError(result.error)
            return
          }
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
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
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
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
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
          showSuccess('Category added successfully')
          // Refresh categories with current pagination
          const addResult = await loadCategories(
            currentCategoryOffset,
            categoryPagination.itemsPerPage,
            categorySearch.debouncedSearchTerm
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
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
          showSuccess('Category updated successfully')
          // Refresh categories with current pagination
          const editResult = await loadCategories(
            currentCategoryOffset,
            categoryPagination.itemsPerPage,
            categorySearch.debouncedSearchTerm
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
          handleLoadTypes(currentOffset, pagination.itemsPerPage, search.debouncedSearchTerm)
          showSuccess('Category deleted successfully')
          // Refresh categories with current pagination
          const deleteResult = await loadCategories(
            currentCategoryOffset,
            categoryPagination.itemsPerPage,
            categorySearch.debouncedSearchTerm
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
      console.error('Error in modal action:', error)
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

  // Add this new function
  const loadAllCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('mini_categories')
        .select('*')
        .order('name')

      if (error) throw error
      if (data) setAllCategories(data)
    } catch (error) {
      console.error('Error loading all categories:', error)
      showError('Failed to load categories')
    }
  }

  // Add effect to load all categories when modal opens
  useEffect(() => {
    if (modalState.type === 'categories') {
      loadAllCategories()
    }
  }, [modalState.type])

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
            onEdit={(type) => {
              handleTypeSelect(type)
              setModalState({ type: 'edit', isOpen: true, data: type })
            }}
            onDelete={(type) => {
              handleTypeSelect(type)
              handleDeleteClick(type)
            }}
            loading={isLoading || loading.isLoading}
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
              onPageChange: handlePageChange
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
            items={allCategories.filter(cat => 
              selectedTypeCategories.includes(cat.id)
            )}
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
            onEdit={(category) => {
              setModalState({ 
                type: 'editCategory', 
                isOpen: true, 
                data: category 
              })
            }}
            onDelete={(category) => {
              setModalState({
                type: 'deleteCategory',
                isOpen: true,
                data: category
              })
            }}
            loading={isLoading || loading.isLoading}
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
              onPageChange: handleCategoryPageChange
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
        categories={allCategories}
        selectedCategoryIds={selectedTypeCategories}
        isLoading={loading.isLoading}
      />

      <UI.DeleteConfirmModal
        isOpen={modalState.type === 'delete'}
        icon={FaExclamationTriangle}
        iconColor="text-red-500"
        onClose={handleModalClose}
        onConfirm={() => handleModalAction('delete')}
        title="Delete Confirmation"
        message={`Are you sure you want to delete "${modalState.data?.name}"? This action cannot be undone.`}
        isLoading={loading.isLoading}
      />

      <CategoryModal
        isOpen={['addCategory', 'editCategory'].includes(modalState.type || '')}
        onClose={handleModalClose}
        onSubmit={(name) => handleModalAction(modalState.type || '', name)}
        category={modalState.type === 'editCategory' ? modalState.data : null}
        isLoading={loading.isLoading}
      />

      <UI.DeleteConfirmModal
        isOpen={modalState.type === 'deleteCategory'}
        icon={FaExclamationTriangle}
        iconColor="text-red-500"
        onClose={handleModalClose}
        onConfirm={() => handleModalAction('deleteCategory')}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${modalState.data?.name}"? This action cannot be undone.`}
        isLoading={loading.isLoading}
      />

      <UI.DeleteConfirmModal
        isOpen={unlinkCategory.isOpen}
        icon={FaExclamationTriangle}
        iconColor="text-red-500"
        onClose={() => setUnlinkCategory({ category: null, isOpen: false })}
        onConfirm={handleUnlinkConfirm}
        title="Unlink Category"
        message={`Are you sure you want to unlink the category "${unlinkCategory.category?.name}" from type "${selectedType?.name}"? This action cannot be undone.`}
        isLoading={loading.isLoading}
      />
    </>
  )
} 