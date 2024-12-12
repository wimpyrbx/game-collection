import { useState, useEffect } from 'react'
import * as UI from '../ui'

interface ProductLine {
  id: number
  name: string
}

interface EditProductLineModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string) => Promise<void>
  productLine: ProductLine | null
  isLoading?: boolean
}

export default function EditProductLineModal({ 
  isOpen, 
  onClose, 
  onEdit, 
  productLine,
  isLoading 
}: EditProductLineModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (productLine) {
      setName(productLine.name)
    }
  }, [productLine])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productLine || !name.trim()) return
    await onEdit(productLine.id, name.trim())
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalLayout
          title="Edit Product Line"
          submitLabel="Save Changes"
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