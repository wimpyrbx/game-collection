import { useState, useEffect, useMemo, useCallback } from 'react'
import Modal from './Modal'

interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  type: { id: number; name: string } | null
  selectedCategories: number[]
  onSave: (categoryIds: number[]) => void
  categories: { id: number; name: string }[]
}

export default function ManageCategoriesModal({ 
  isOpen, 
  onClose, 
  type,
  selectedCategories = [],
  onSave,
  categories = []
}: ManageCategoriesModalProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelected(selectedCategories)
    }
  }, [isOpen])

  const handleSave = async () => {
    await onSave(selected)
    onClose()  // Close modal after saving
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

  const modalFooter = (
    <div className="flex justify-between items-center">
      <div className="text-sm text-gray-500 italic">
        {selected.length} categories selected
      </div>
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} footer={modalFooter}>
      <div>
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Manage Categories
              </h2>
              <div className="text-sm text-gray-400 mt-1">
                Type: {type?.name}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-300 -mt-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <div className="mt-4 max-h-[400px] overflow-y-auto">
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
        </div>
      </div>
    </Modal>
  )
} 