import { useState } from 'react'
import * as UI from '../ui'
import { FaArchive } from 'react-icons/fa'

interface AddTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  isLoading?: boolean
}

export default function AddTypeModal({ isOpen, onClose, onSubmit, isLoading }: AddTypeModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim())
    setName('')
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaArchive />
            </div>
            <h2 className="text-xl font-semibold">Add Mini Type</h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.Input
            label="Type Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter type name"
            required
            autoFocus
          />
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-end gap-2">
            <UI.Button
              variant="btnPrimary"
              onClick={onClose}
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="btnSuccess"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Type'}
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 