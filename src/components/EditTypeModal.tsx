import { useState, useEffect } from 'react'
import * as UI from './ui'

interface EditTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string) => void
  type: { id: number; name: string } | null
}

export default function EditTypeModal({ isOpen, onClose, onEdit, type }: EditTypeModalProps) {
  const [name, setName] = useState(type?.name || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (type) {
      setName(type.name)
    }
  }, [type])

  const handleSubmit = async () => {
    if (!type) return

    setError('')
    setIsSubmitting(true)

    try {
      await onEdit(type.id, name)
      onClose()
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unknown error occurred')
      }
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
        disabled={isSubmitting || !name.trim() || name === type?.name}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose} footer={modalFooter}>
      <div>
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Edit Type
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Type Name
              </label>
              <UI.SearchInput
                value={name}
                onChange={(value) => setName(value)}
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
    </UI.Modal>
  )
} 