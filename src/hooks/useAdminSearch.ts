import { useState, useCallback, useEffect } from 'react'

interface UseAdminSearchProps {
  defaultSearchTerm?: string
  searchFields?: string[]
  debounceMs?: number
  onSearch?: (term: string) => void
}

interface UseAdminSearchReturn {
  searchTerm: string
  debouncedSearchTerm: string
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
  searchFields = ['name'],
  debounceMs = 500,
  onSearch
}: UseAdminSearchProps = {}): UseAdminSearchReturn {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(defaultSearchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      if (onSearch) {
        onSearch(searchTerm)
      }
    }, debounceMs)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, debounceMs, onSearch])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const filterItems = useCallback(<T extends Record<string, any>>(items: T[]): T[] => {
    if (!debouncedSearchTerm) return items

    const searchTermLower = debouncedSearchTerm.toLowerCase()
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]
        return value && value.toString().toLowerCase().includes(searchTermLower)
      })
    )
  }, [debouncedSearchTerm, searchFields])

  return {
    searchTerm,
    debouncedSearchTerm,
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