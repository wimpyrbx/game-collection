import * as UI from '../ui'
import { FaBuilding } from 'react-icons/fa'

interface AddCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string) => Promise<void>
  isLoading?: boolean
}

export function AddCompanyModal({ isOpen, onClose, onAdd, isLoading = false }: AddCompanyModalProps) {
  const fields = [
    {
      name: 'name',
      label: 'Company Name',
      type: 'input' as const,
      placeholder: 'Enter company name'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea' as const,
      placeholder: 'Enter company description'
    }
  ]

  const handleSubmit = async (values: Record<string, string>) => {
    await onAdd(values.name, values.description)
  }

  return (
    <UI.ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Add Company"
      icon={FaBuilding}
      iconColor="text-blue-600"
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel="Add Company"
      isLoading={isLoading}
    />
  )
} 