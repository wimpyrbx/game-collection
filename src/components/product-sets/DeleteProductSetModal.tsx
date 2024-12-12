import * as UI from '../ui'

interface ProductSet {
  id: number
  name: string
}

interface DeleteProductSetModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  productSet: ProductSet | null
  isLoading?: boolean
}

export default function DeleteProductSetModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productSet,
  isLoading 
}: DeleteProductSetModalProps) {
  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <UI.ModalLayout
        title="Delete Product Set"
        submitLabel="Delete Product Set"
        submitVariant="btnDanger"
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={isLoading}
      >
        <p className="text-gray-600">
          {productSet
            ? `Are you sure you want to delete the product set "${productSet.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this product set? This action cannot be undone.'}
        </p>
      </UI.ModalLayout>
    </UI.Modal>
  )
} 