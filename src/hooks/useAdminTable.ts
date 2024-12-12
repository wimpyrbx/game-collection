import { useState, useEffect } from 'react'
import { useNotification } from './useNotification'

interface UseAdminTableProps<T> {
  loadItems: (offset: number, limit: number, search?: string) => Promise<{
    data: T[]
    count: number
    error?: string
  }>
  addItem: (data: Partial<T>) => Promise<{ data?: T, error?: string }>
  editItem: (id: number, data: Partial<T>) => Promise<{ data?: T, error?: string }>
  deleteItem: (id: number) => Promise<{ error?: string }>
  checkCanDelete?: (item: T) => Promise<{ canDelete: boolean, message?: string }>
  itemsPerPage?: number
}

export function useAdminTable<T extends { id: number }>({
  loadItems,
  addItem,
  editItem,
  deleteItem,
  checkCanDelete,
  itemsPerPage = 10
}: UseAdminTableProps<T>) {
  // State
  const [items, setItems] = useState<T[]>([])
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalState, setModalState] = useState<{
    type: 'add' | 'edit' | 'delete' | null
    isOpen: boolean
  }>({ type: null, isOpen: false })

  const { showSuccess, showError } = useNotification()

  // Load items
  const refresh = async (page = currentPage, search = searchTerm) => {
    setLoading(true)
    try {
      const offset = (page - 1) * itemsPerPage
      const { data, count, error } = await loadItems(offset, itemsPerPage, search)
      if (error) {
        showError(error)
        return
      }
      setItems(data || [])
      setTotalItems(count || 0)
    } catch (error) {
      showError('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
    refresh(1, term)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    refresh(page)
  }

  // Handle add
  const handleAdd = async (data: Partial<T>) => {
    setLoading(true)
    const { error } = await addItem(data)
    if (error) {
      showError(error)
      return false
    }
    showSuccess('Item added successfully')
    refresh()
    setModalState({ type: null, isOpen: false })
    return true
  }

  // Handle edit
  const handleEdit = async (id: number, data: Partial<T>) => {
    setLoading(true)
    const { error } = await editItem(id, data)
    if (error) {
      showError(error)
      return false
    }
    showSuccess('Item updated successfully')
    refresh()
    setModalState({ type: null, isOpen: false })
    return true
  }

  // Handle delete
  const handleDelete = async (item: T) => {
    if (checkCanDelete) {
      const { canDelete, message } = await checkCanDelete(item)
      if (!canDelete) {
        showError(message || 'Cannot delete this item')
        return
      }
    }
    setSelectedItem(item)
    setModalState({ type: 'delete', isOpen: true })
  }

  const confirmDelete = async () => {
    if (!selectedItem) return
    setLoading(true)
    const { error } = await deleteItem(selectedItem.id)
    if (error) {
      showError(error)
      return
    }
    showSuccess('Item deleted successfully')
    setModalState({ type: null, isOpen: false })
    setSelectedItem(null)
    refresh()
  }

  // Initial load
  useEffect(() => {
    refresh()
  }, [])

  return {
    // State
    items,
    selectedItem,
    totalItems,
    currentPage,
    searchTerm,
    loading,
    modalState,
    // Actions
    setSelectedItem,
    setModalState,
    handleSearch,
    handlePageChange,
    handleAdd,
    handleEdit,
    handleDelete,
    confirmDelete,
    refresh
  }
} 