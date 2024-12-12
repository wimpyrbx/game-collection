import { useState } from 'react'
import * as UI from '../ui'

interface AddProductLineModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  isLoading?: boolean
}

export default function AddProductLineModal({ isOpen, onClose, onAdd, isLoading }: AddProductLineModalProps) {
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
          title="Add Product Line"
          submitLabel="Add Product Line"
          onClose={onClose}
          isSubmitting={isLoading}
        >
          <UI.Input
            label="Product Line Name"
            value={name}
            onChange={setName}
            placeholder="Enter product line name"
            required
            autoFocus
          />
        </UI.ModalLayout>
      </form>
    </UI.Modal>
  )
} 