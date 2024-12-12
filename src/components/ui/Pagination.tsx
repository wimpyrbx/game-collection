interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalItems,
  itemsPerPage,
  onPageChange,
  disabled = false,
  className = ''
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  // Don't render if there's only 1 page or no items
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: number[] = []
    
    // Add pages from current-2 to current+2
    for (let i = -2; i <= 2; i++) {
      const pageNum = currentPage + i
      if (pageNum > 0 && pageNum <= totalPages) {
        pages.push(pageNum)
      }
    }
    
    return pages
  }

  const PageButton = ({ 
    page, 
    isDisabled = false, 
    isCurrent = false,
    children 
  }: { 
    page: number, 
    isDisabled?: boolean, 
    isCurrent?: boolean,
    children: React.ReactNode 
  }) => (
    <button
      onClick={() => onPageChange(page)}
      disabled={isDisabled || disabled}
      className={`
        px-2 py-1 rounded
        ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  )

  return (
    <div className={`flex justify-between items-center text-sm ${className}`}>
      {/* Left section - First and Previous */}
      <div className="flex gap-2">
        <PageButton page={1} isDisabled={currentPage === 1}>
          First
        </PageButton>
        <PageButton page={currentPage - 1} isDisabled={currentPage === 1}>
          «
        </PageButton>
      </div>

      {/* Center section - Page numbers */}
      <div className="flex gap-2">
        {getPageNumbers().map(pageNum => (
          <PageButton
            key={pageNum}
            page={pageNum}
            isCurrent={pageNum === currentPage}
          >
            {pageNum}
          </PageButton>
        ))}
      </div>

      {/* Right section - Next and Last */}
      <div className="flex gap-2">
        <PageButton page={currentPage + 1} isDisabled={currentPage === totalPages}>
          »
        </PageButton>
        <PageButton page={totalPages} isDisabled={currentPage === totalPages}>
          Last ({totalPages})
        </PageButton>
      </div>
    </div>
  )
} 