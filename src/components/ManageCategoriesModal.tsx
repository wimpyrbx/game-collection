import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import type { MiniType, MiniCategory } from '../lib/supabase'

interface ManageCategoriesModalProps {
  type: MiniType | null
  isOpen: boolean
  onClose: () => void
  categories: MiniCategory[]
  selectedCategoryIds: number[]
  onSave: (categoryIds: number[]) => Promise<{ error: string | null }>
}

export function ManageCategoriesModal({ 
  type, 
  isOpen, 
  onClose, 
  categories,
  selectedCategoryIds,
  onSave 
}: ManageCategoriesModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setSelectedIds(selectedCategoryIds)
  }, [selectedCategoryIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) return

    setError('')
    setIsSubmitting(true)

    try {
      const result = await onSave(selectedIds)
      if (!result.error) {
        onClose()
      } else {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCategories = categories
    .filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggleCategory = (categoryId: number) => {
    setSelectedIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      <div className="mb-4">
        <p className="text-sm text-gray-400">
          Select categories to assign to type {type?.name}
        </p>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full bg-gray-700 p-2 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto mb-4">
        {filteredCategories.map(category => (
          <div
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            className={`p-2 rounded cursor-pointer mb-1 ${
              selectedIds.includes(category.id)
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(category.id)}
                onChange={() => {}} // Handled by parent div onClick
                className="mr-2"
              />
              {category.name}
            </label>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-400 mb-4">
        {selectedIds.length} categories selected
      </div>

      {error && (
        <div className="mb-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
} 