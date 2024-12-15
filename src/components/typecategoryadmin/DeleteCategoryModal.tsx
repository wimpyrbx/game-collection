import * as UI from '../ui'
import { FaExclamationTriangle } from 'react-icons/fa'

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  category: { name: string } | null
  isLoading?: boolean
}

export default function DeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  category,
  isLoading
}: DeleteCategoryModalProps) {
  return (
    <UI.DeleteConfirmModal
      isOpen={isOpen}
      icon={FaExclamationTriangle}
      iconColor="text-red-500"
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Category"
      message={`Are you sure you want to delete the category "${category?.name}"? This action cannot be undone.`}
      isLoading={isLoading}
    />
  )
} 