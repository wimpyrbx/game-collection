import * as UI from '../ui'

interface DeleteCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  company: { id: number; name: string } | null
  isLoading?: boolean
}

export function DeleteCompanyModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  company,
  isLoading = false 
}: DeleteCompanyModalProps) {
  return (
    <UI.Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
    >
      <div className="space-y-4">
        <p>
          Are you sure you want to delete company "{company?.name}"? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <UI.Button
            variant="btnSecondary"
            onClick={onClose}
          >
            Cancel
          </UI.Button>
          <UI.Button
            variant="btnDanger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Company'}
          </UI.Button>
        </div>
      </div>
    </UI.Modal>
  )
} 