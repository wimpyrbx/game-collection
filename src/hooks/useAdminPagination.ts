import { useState } from 'react'

interface UseAdminPaginationProps {
  itemsPerPage?: number
  defaultPage?: number
  totalItems?: number
}

interface UseAdminPaginationReturn {
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  getPageItems: <T>(items: T[]) => T[]
  totalPages: number
  handlePageChange: (page: number) => void
  paginationProps: {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
  }
}

export function useAdminPagination({
  itemsPerPage = 10,
  defaultPage = 1,
  totalItems = 0
}: UseAdminPaginationProps = {}): UseAdminPaginationReturn {
  const [currentPage, setCurrentPage] = useState(defaultPage)
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const handlePageChange = (page: number) => {
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const getPageItems = <T>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return items.slice(startIndex, Math.min(startIndex + itemsPerPage, items.length))
  }

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    getPageItems,
    totalPages,
    handlePageChange,
    paginationProps: {
      currentPage,
      totalItems,
      itemsPerPage,
      onPageChange: handlePageChange
    }
  }
} 