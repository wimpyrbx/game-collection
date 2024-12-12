import { useState, useEffect, useMemo, useCallback } from 'react'
import * as UI from './ui'
import { FaListAlt } from 'react-icons/fa'

interface Category {
  id: number
  name: string
}

interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (categoryIds: number[]) => Promise<void>
  categories: Category[]
  selectedCategoryIds: number[]
  isLoading?: boolean
}

export default function ManageCategoriesModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  categories = [],
  selectedCategoryIds = [],
  isLoading
}: ManageCategoriesModalProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setSelected(selectedCategoryIds)
  }, [selectedCategoryIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(selected)
  }

  const filteredCategories = useMemo(() => 
    categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [categories, searchTerm]
  )

  const toggleCategory = useCallback((categoryId: number) => {
    setSelected(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }, [])

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaListAlt />
            </div>
            <h2 className="text-xl font-semibold">Manage Categories</h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full mb-4"
          />

          <div className="max-h-[400px] overflow-y-auto">
            {filteredCategories.map(category => {
              const isSelected = selected.includes(category.id)
              
              return (
                <label
                  key={category.id}
                  className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700 ${
                    isSelected ? 'bg-green-600/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(category.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                      isSelected
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-500'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    <span>{category.name}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-gray-500 italic">
              {selected.length} categories selected
            </div>
            <div className="flex gap-2">
              <UI.Button
                variant="btnPrimary"
                onClick={onClose}
              >
                Cancel
              </UI.Button>
              <UI.Button
                variant="btnSuccess"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </UI.Button>
            </div>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 