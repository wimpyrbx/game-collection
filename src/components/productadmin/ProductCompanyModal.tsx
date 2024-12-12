import { useState, useEffect } from 'react'
import * as UI from '../ui'
import { FaBuilding } from 'react-icons/fa'

interface ProductCompany {
  id: number
  name: string
}

interface ProductCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  isLoading?: boolean
  company?: ProductCompany | null // If provided, we're in edit mode
}

export default function ProductCompanyModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  company 
}: ProductCompanyModalProps) {
  const [name, setName] = useState('')
  const isEditMode = !!company

  useEffect(() => {
    if (company) {
      setName(company.name)
    } else {
      setName('')
    }
  }, [company])

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
              <FaBuilding />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditMode ? 'Edit Company' : 'Add Company'}
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.Input
            label="Company Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter company name"
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
                : (isEditMode ? 'Save Changes' : 'Add Company')
              }
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 