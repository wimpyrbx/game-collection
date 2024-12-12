import { useState, useCallback } from 'react'

interface UseAdminSearchProps {
  defaultSearchTerm?: string
  searchFields?: string[]
}

interface UseAdminSearchReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  handleSearch: (term: string) => void
  filterItems: <T extends Record<string, any>>(items: T[]) => T[]
  searchProps: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
}

export function useAdminSearch({
  defaultSearchTerm = '',
  searchFields = ['name']
}: UseAdminSearchProps = {}): UseAdminSearchReturn {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm)

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const filterItems = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (!searchTerm) return items

    const lowerSearchTerm = searchTerm.toLowerCase()
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field]
        return value && value.toString().toLowerCase().includes(lowerSearchTerm)
      })
    )
  }, [searchTerm, searchFields])

  return {
    searchTerm,
    setSearchTerm,
    handleSearch,
    filterItems,
    searchProps: {
      value: searchTerm,
      onChange: handleSearch,
      placeholder: 'Search...'
    }
  }
} 