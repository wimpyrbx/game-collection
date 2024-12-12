import * as UI from './ui'

interface DeleteTypeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  typeName: string
}

export default function DeleteTypeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  typeName
}: DeleteTypeConfirmationModalProps) {
  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p className="mb-6">
          Are you sure you want to delete type "{typeName}"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Delete Type
          </button>
        </div>
      </div>
    </UI.Modal>
  )
} 