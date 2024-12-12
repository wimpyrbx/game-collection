import * as UI from '../ui'

interface ProductLine {
  id: number
  name: string
}

interface DeleteProductLineModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  productLine: ProductLine | null
  isLoading?: boolean
}

export default function DeleteProductLineModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productLine,
  isLoading 
}: DeleteProductLineModalProps) {
  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <UI.ModalLayout
        title="Delete Product Line"
        submitLabel="Delete Product Line"
        submitVariant="btnDanger"
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={isLoading}
      >
        <p className="text-gray-600">
          {productLine
            ? `Are you sure you want to delete the product line "${productLine.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this product line? This action cannot be undone.'}
        </p>
      </UI.ModalLayout>
    </UI.Modal>
  )
} 