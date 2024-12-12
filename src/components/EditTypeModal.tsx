import { useState, useEffect } from 'react'
import * as UI from './ui'
import { FaArchive } from 'react-icons/fa'

interface EditTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  initialName: string
  isLoading?: boolean
}

export default function EditTypeModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  initialName,
  isLoading 
}: EditTypeModalProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name === initialName) return
    await onSubmit(name.trim())
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaArchive />
            </div>
            <h2 className="text-xl font-semibold">Edit Mini Type</h2>
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
              disabled={isLoading || !name.trim() || name === initialName}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 