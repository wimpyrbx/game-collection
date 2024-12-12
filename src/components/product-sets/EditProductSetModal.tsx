import { useState, useEffect } from 'react'
import * as UI from '../ui'

interface ProductSet {
  id: number
  name: string
}

interface EditProductSetModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string) => Promise<void>
  productSet: ProductSet | null
  isLoading?: boolean
}

export default function EditProductSetModal({ 
  isOpen, 
  onClose, 
  onEdit, 
  productSet,
  isLoading 
}: EditProductSetModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (productSet) {
      setName(productSet.name)
    }
  }, [productSet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productSet || !name.trim()) return
    await onEdit(productSet.id, name.trim())
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalLayout
          title="Edit Product Set"
          submitLabel="Save Changes"
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