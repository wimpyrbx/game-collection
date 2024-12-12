interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalItems,
  itemsPerPage,
  onPageChange,
  className = ''
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  // Don't render if there's only 1 page or no items
  if (totalPages <= 1) return null

  const getPageNumbers = (current: number, total: number) => {
    const pageNumbers: (number | string)[] = []
    const startPage = Math.max(1, current - 2)
    const endPage = Math.min(total, current + 2)

    // Add first page with ellipsis if there's a gap at the start
    if (startPage > 2) {
      pageNumbers.push(1)
      pageNumbers.push('...')
    } else if (startPage === 2) {
      pageNumbers.push(1)
    }

    // Add the center range of pages
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    // Add last page with ellipsis if there's a gap at the end
    if (endPage < total - 1) {
      pageNumbers.push('...')
      pageNumbers.push(total)
    } else if (endPage === total - 1) {
      pageNumbers.push(total)
    }

    return pageNumbers
  }

  const PageButton = ({ 
    page, 
    disabled = false, 
    children 
  }: { 
    page: number | string, 
    disabled?: boolean, 
    children: React.ReactNode 
  }) => {
    // If page is ellipsis, render it without click handler
    if (page === '...') {
      return <span className="px-3 py-1">{page}</span>
    }

    return (
      <button
        onClick={() => onPageChange(page as number)}
        disabled={disabled}
        className={`px-3 py-1 rounded ${
          page === currentPage
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={`flex justify-between items-center text-sm ${className}`}>
      <div className="flex gap-2">
        <PageButton page={1} disabled={currentPage === 1}>
          First
        </PageButton>
        <PageButton page={currentPage - 1} disabled={currentPage === 1}>
          «
        </PageButton>
      </div>

      <div className="flex gap-2">
        {getPageNumbers(currentPage, totalPages).map((pageNum, idx) => (
          <PageButton key={`${pageNum}-${idx}`} page={pageNum}>
            {pageNum}
          </PageButton>
        ))}
      </div>

      <div className="flex gap-2">
        <PageButton page={currentPage + 1} disabled={currentPage === totalPages}>
          »
        </PageButton>
        <PageButton page={totalPages} disabled={currentPage === totalPages}>
          Last ({totalPages})
        </PageButton>
      </div>
    </div>
  )
} 