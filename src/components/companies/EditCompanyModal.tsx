import * as UI from '../ui'
import { FaBuilding } from 'react-icons/fa'

interface EditCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: number, name: string, description: string) => Promise<void>
  company: { id: number; name: string; description?: string } | null
  isLoading?: boolean
}

export function EditCompanyModal({ 
  isOpen, 
  onClose, 
  onEdit, 
  company,
  isLoading = false 
}: EditCompanyModalProps) {
  const fields = [
    {
      name: 'name',
      label: 'Company Name',
      type: 'input' as const,
      placeholder: 'Enter company name',
      initialValue: company?.name
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea' as const,
      placeholder: 'Enter company description',
      initialValue: company?.description
    }
  ]

  const handleSubmit = async (values: Record<string, string>) => {
    if (company) {
      await onEdit(company.id, values.name, values.description)
    }
  }

  return (
    <UI.ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Company"
      icon={FaBuilding}
      iconColor="text-blue-600"
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      isLoading={isLoading}
    />
  )
}