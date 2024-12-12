import { useState, useEffect } from 'react'
import { useNotification } from './useNotification'

interface UseHierarchicalAdminProps<P, C, S> {
  // Parent level (e.g., Companies)
  loadParents: (offset: number, limit: number, search?: string) => Promise<{
    data: P[]
    count: number
    error?: string
  }>
  // Child level (e.g., Product Lines)
  loadChildren: (parentId: number) => Promise<{
    data: C[]
    error?: string
  }>
  // Sub-child level (e.g., Product Sets)
  loadSubChildren: (childId: number) => Promise<{
    data: S[]
    error?: string
  }>
  itemsPerPage?: number
}

export function useHierarchicalAdmin<
  P extends { id: number },
  C extends { id: number },
  S extends { id: number }
>({
  loadParents,
  loadChildren,
  loadSubChildren,
  itemsPerPage = 10
}: UseHierarchicalAdminProps<P, C, S>) {
  // Parent state
  const [parents, setParents] = useState<P[]>([])
  const [selectedParent, setSelectedParent] = useState<P | null>(null)
  const [totalParents, setTotalParents] = useState(0)
  const [parentPage, setParentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingParents, setLoadingParents] = useState(false)

  // Child state
  const [children, setChildren] = useState<C[]>([])
  const [selectedChild, setSelectedChild] = useState<C | null>(null)
  const [loadingChildren, setLoadingChildren] = useState(false)

  // Sub-child state
  const [subChildren, setSubChildren] = useState<S[]>([])
  const [selectedSubChild, setSelectedSubChild] = useState<S | null>(null)
  const [loadingSubChildren, setLoadingSubChildren] = useState(false)

  const { showError } = useNotification()

  // Load parents
  const refreshParents = async (page = parentPage, search = searchTerm) => {
    setLoadingParents(true)
    try {
      const offset = (page - 1) * itemsPerPage
      const { data, count, error } = await loadParents(offset, itemsPerPage, search)
      if (error) {
        showError(error)
        return
      }
      setParents(data || [])
      setTotalParents(count || 0)
    } catch (error) {
      showError('Failed to load parent items')
    } finally {
      setLoadingParents(false)
    }
  }

  // Load children
  const refreshChildren = async (parentId: number) => {
    setLoadingChildren(true)
    try {
      const { data, error } = await loadChildren(parentId)
      if (error) {
        showError(error)
        return
      }
      setChildren(data || [])
    } catch (error) {
      showError('Failed to load child items')
    } finally {
      setLoadingChildren(false)
    }
  }

  // Load sub-children
  const refreshSubChildren = async (childId: number) => {
    setLoadingSubChildren(true)
    try {
      const { data, error } = await loadSubChildren(childId)
      if (error) {
        showError(error)
        return
      }
      setSubChildren(data || [])
    } catch (error) {
      showError('Failed to load sub-child items')
    } finally {
      setLoadingSubChildren(false)
    }
  }

  // Handle parent selection
  const handleParentSelect = async (parent: P) => {
    setSelectedParent(parent)
    setSelectedChild(null)
    setSelectedSubChild(null)
    await refreshChildren(parent.id)
  }

  // Handle child selection
  const handleChildSelect = async (child: C) => {
    setSelectedChild(child)
    setSelectedSubChild(null)
    await refreshSubChildren(child.id)
  }

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setParentPage(1)
    refreshParents(1, term)
  }

  // Handle parent page change
  const handleParentPageChange = (page: number) => {
    setParentPage(page)
    refreshParents(page)
  }

  // Initial load
  useEffect(() => {
    refreshParents()
  }, [])

  // Reset children when parent changes
  useEffect(() => {
    if (!selectedParent) {
      setChildren([])
      setSelectedChild(null)
    }
  }, [selectedParent])

  // Reset sub-children when child changes
  useEffect(() => {
    if (!selectedChild) {
      setSubChildren([])
      setSelectedSubChild(null)
    }
  }, [selectedChild])

  return {
    // Parent level
    parents,
    selectedParent,
    totalParents,
    parentPage,
    searchTerm,
    loadingParents,
    // Child level
    children,
    selectedChild,
    loadingChildren,
    // Sub-child level
    subChildren,
    selectedSubChild,
    loadingSubChildren,
    // Actions
    setSelectedParent,
    setSelectedChild,
    setSelectedSubChild,
    handleParentSelect,
    handleChildSelect,
    handleSearch,
    handleParentPageChange,
    refreshParents,
    refreshChildren,
    refreshSubChildren
  }
} 