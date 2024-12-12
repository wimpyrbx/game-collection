import { useState, useEffect } from 'react'
import * as UI from '../ui'
import { FaList } from 'react-icons/fa'

interface ProductLine {
  id: number
  name: string
}

interface ProductLineModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  isLoading?: boolean
  productLine?: ProductLine | null // If provided, we're in edit mode
}

export default function ProductLineModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  productLine 
}: ProductLineModalProps) {
  const [name, setName] = useState('')
  const isEditMode = !!productLine

  useEffect(() => {
    if (productLine) {
      setName(productLine.name)
    } else {
      setName('')
    }
  }, [productLine])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim())
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
              <FaList />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditMode ? 'Edit Product Line' : 'Add Product Line'}
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.Input
            label="Product Line Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product line name"
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
              {isLoading 
                ? (isEditMode ? 'Saving...' : 'Adding...') 
                : (isEditMode ? 'Save Changes' : 'Add Product Line')
              }
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 