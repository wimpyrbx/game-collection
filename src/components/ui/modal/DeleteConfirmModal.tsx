import { Button } from '../Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { IconType } from 'react-icons'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isLoading?: boolean
  title: string
  message: string
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
  icon: Icon,
  iconColor = 'text-red-500'
}: DeleteConfirmModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`text-xl ${iconColor}`}>
                <Icon />
              </div>
            )}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
        </ModalHeader>

        <ModalBody>
          <p className="text-gray-300">{message}</p>
        </ModalBody>

        <ModalFooter>
          <div className="flex justify-end gap-2">
            <Button
              variant="btnPrimary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="btnDanger"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  )
} 