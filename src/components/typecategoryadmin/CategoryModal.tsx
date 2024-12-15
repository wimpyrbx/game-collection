import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';
import { Input } from '../ui/input/Input';

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => void
  category?: { id: number; name: string } | null
  isLoading: boolean
}

export default function CategoryModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  category = null,
  isLoading 
}: CategoryModalProps) {
  const [name, setName] = useState(category?.name || '')

  useEffect(() => {
    if (category) {
      setName(category.name)
    } else {
      setName('')
    }
  }, [category, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          {category ? 'Edit Category' : 'Add Category'}
        </ModalHeader>
        <ModalBody>
          <Input
            label="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            required
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  categoryName: string
  isLoading?: boolean
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  isLoading
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Delete Category</ModalHeader>
      <ModalBody>
        <p>Are you sure you want to delete the category "{categoryName}"?</p>
        <p className="mt-2 text-sm text-gray-500">
          This action cannot be undone if the category is not in use.
        </p>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? 'Deleting...' : 'Delete Category'}
        </button>
      </ModalFooter>
    </Modal>
  )
} 