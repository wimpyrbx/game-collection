import { useState, useEffect } from 'react'
import * as UI from '../ui'
import { FaCubes } from 'react-icons/fa'

interface ProductSet {
  id: number
  name: string
}

interface ProductSetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  isLoading?: boolean
  productSet?: ProductSet | null // If provided, we're in edit mode
}

export default function ProductSetModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  productSet 
}: ProductSetModalProps) {
  const [name, setName] = useState('')
  const isEditMode = !!productSet

  useEffect(() => {
    if (productSet) {
      setName(productSet.name)
    } else {
      setName('')
    }
  }, [productSet])

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
              <FaCubes />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditMode ? 'Edit Product Set' : 'Add Product Set'}
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.Input
            label="Product Set Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product set name"
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
                : (isEditMode ? 'Save Changes' : 'Add Product Set')
              }
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 