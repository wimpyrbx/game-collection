import Modal from './Modal'

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-red-900/50 rounded-lg">
        <div className="px-6 py-4 border-b border-red-900">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Delete Type
            </h2>
            <div className="text-sm text-gray-300 mt-1">
              Type: {typeName}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-red-950/80">
          <p className="text-gray-300">
            Are you sure you want to delete this type? This action cannot be undone.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-red-900 flex justify-end gap-4">
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
            Delete
          </button>
        </div>
      </div>
    </Modal>
  )
} 