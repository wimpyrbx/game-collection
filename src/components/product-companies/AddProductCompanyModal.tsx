import { useState } from 'react'
import * as UI from '../ui'

interface AddProductCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  isLoading?: boolean
}

export default function AddProductCompanyModal({ isOpen, onClose, onAdd, isLoading }: AddProductCompanyModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd(name.trim())
    setName('')
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalLayout
          title="Add Company"
          submitLabel="Add Company"
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