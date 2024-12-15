import { useState, useEffect } from 'react'
import * as UI from '../ui'
import { FaDiceD6 } from 'react-icons/fa'
import type { Mini } from '../../types/mini'

interface MiniatureOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  mini?: Mini // Optional for edit mode
  onSave: (data: Partial<Mini>) => Promise<void>
  isLoading?: boolean
}

export function MiniatureOverviewModal({ 
  isOpen, 
  onClose, 
  mini, 
  onSave,
  isLoading 
}: MiniatureOverviewModalProps) {
  const [name, setName] = useState('')
  const isEditMode = !!mini

  useEffect(() => {
    if (mini) {
      setName(mini.name)
    } else {
      setName('')
    }
  }, [mini])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({ name: name.trim() })
    if (!isEditMode) {
      setName('')
    }
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaDiceD6 />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditMode ? 'Edit Miniature' : 'Add New Miniature'}
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter miniature name"
            required
            autoFocus
          />
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-end gap-2">
            <UI.Button
              variant="btnPrimary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="btnSuccess"
              type="submit"
              disabled={isLoading}
            >
              {isLoading 
                ? (isEditMode ? 'Saving...' : 'Adding...') 
                : (isEditMode ? 'Save Changes' : 'Add Miniature')
              }
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 