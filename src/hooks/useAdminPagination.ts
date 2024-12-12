import { useState } from 'react'

interface UseAdminPaginationProps {
  itemsPerPage?: number
  defaultPage?: number
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
  defaultPage = 1
}: UseAdminPaginationProps = {}): UseAdminPaginationReturn {
  const [currentPage, setCurrentPage] = useState(defaultPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getPageItems = <T>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return items.slice(startIndex, startIndex + itemsPerPage)
  }

  const getTotalPages = (totalItems: number): number => {
    return Math.ceil(totalItems / itemsPerPage)
  }

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    getPageItems,
    totalPages: 0, // This will be calculated when items are passed to getPageItems
    handlePageChange,
    paginationProps: {
      currentPage,
      totalItems: 0, // This will be updated when used
      itemsPerPage,
      onPageChange: handlePageChange
    }
  }
} 