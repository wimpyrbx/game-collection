import * as UI from '.'
import { IconType } from 'react-icons'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isLoading?: boolean
  title: string
  message: string
  itemName: string
  icon?: IconType
  iconColor?: string
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  message,
  itemName,
  icon: Icon,
  iconColor = 'text-red-500'
}: DeleteConfirmModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirm()
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`text-xl ${iconColor}`}>
                <Icon />
              </div>
            )}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <p className="text-gray-300">{message}</p>
          <p className="mt-2 font-semibold text-gray-300"><strong>"{itemName}"</strong></p>
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-end gap-2">
            <UI.Button
              variant="btnPrimary"
              onClick={onClose}
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="btnDanger"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 