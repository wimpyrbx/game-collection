import * as UI from '../ui'

interface ProductCompany {
  id: number
  name: string
}

interface DeleteProductCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  company: ProductCompany | null
  isLoading?: boolean
}

export default function DeleteProductCompanyModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  company,
  isLoading 
}: DeleteProductCompanyModalProps) {
  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <UI.ModalLayout
        title="Delete Company"
        description={
          company
            ? `Are you sure you want to delete the company "${company.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this company? This action cannot be undone.'
        }
        submitLabel="Delete Company"
        submitVariant="btnDanger"
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={isLoading}
      />
    </UI.Modal>
  )
} 