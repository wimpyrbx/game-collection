import { useState, useEffect } from 'react'
import * as UI from '../ui'

interface ProductCompany {
  id: number
  name: string
}

interface EditProductCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string) => Promise<void>
  company: ProductCompany | null
  isLoading?: boolean
}

export default function EditProductCompanyModal({ 
  isOpen, 
  onClose, 
  onEdit, 
  company,
  isLoading 
}: EditProductCompanyModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (company) {
      setName(company.name)
    }
  }, [company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !name.trim()) return
    await onEdit(company.id, name.trim())
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalLayout
          title="Edit Company"
          submitLabel="Save Changes"
          onClose={onClose}
          isSubmitting={isLoading}
        >
          <UI.Input
            label="Company Name"
            value={name}
            onChange={setName}
            placeholder="Enter company name"
            required
            autoFocus
          />
        </UI.ModalLayout>
      </form>
    </UI.Modal>
  )
}