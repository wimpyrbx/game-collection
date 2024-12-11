import { useState } from 'react'
import Modal from './Modal'

interface AddTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => void
}

export default function AddTypeModal({ isOpen, onClose, onAdd }: AddTypeModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      await onAdd(name)
      setName('')
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalFooter = (
    <div className="flex justify-end gap-4">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !name.trim()}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add Type'}
      </button>
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
                Add New Type
              </h2>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Type Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter type name"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
} 