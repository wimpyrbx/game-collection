import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import type { MiniType } from '../lib/supabase'

interface EditTypeModalProps {
  type: MiniType | null
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string) => Promise<{ error: string | null }>
}

export function EditTypeModal({ type, isOpen, onClose, onEdit }: EditTypeModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (type) {
      setName(type.name)
    }
  }, [type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) return

    setError('')
    setIsSubmitting(true)

    try {
      const result = await onEdit(type.id, name)
      if (!result.error) {
        onClose()
      } else {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Type">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Type Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 rounded p-2"
            placeholder="Enter type name"
            required
          />
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
            type="submit"
            disabled={isSubmitting || !name.trim() || name === type?.name}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
} 