import { useState } from 'react'
import * as UI from '../ui'

interface AddProductSetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  isLoading?: boolean
}

export default function AddProductSetModal({ isOpen, onClose, onAdd, isLoading }: AddProductSetModalProps) {
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
          title="Add Product Set"
          submitLabel="Add Product Set"
          onClose={onClose}
          isSubmitting={isLoading}
        >
          <UI.Input
            label="Product Set Name"
            value={name}
            onChange={setName}
            placeholder="Enter product set name"
            required
            autoFocus
          />
        </UI.ModalLayout>
      </form>
    </UI.Modal>
  )
} 